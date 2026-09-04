"""
RazorVigil Sentinel — Feature Tokenizer Transformer (FT-Transformer).
Deep tabular neural architecture for multi-hop non-linear payment fraud representation learning.
Supports high-throughput GPU training (PyTorch CUDA DDP) and quantized inference.
"""

from __future__ import annotations

import math
from typing import List, Optional, Tuple
import torch
import torch.nn as nn
import torch.nn.functional as F


class NumericalFeatureTokenizer(nn.Module):
    """
    Transforms continuous numerical features x_j in R into d-dimensional token embeddings
    via learnable weight vectors: e_j = x_j * W_j + b_j.
    """

    def __init__(self, n_features: int, d_token: int):
        super().__init__()
        self.n_features = n_features
        self.d_token = d_token
        self.weight = nn.Parameter(torch.empty(n_features, d_token))
        self.bias = nn.Parameter(torch.empty(n_features, d_token))
        nn.init.kaiming_uniform_(self.weight, a=math.sqrt(5))
        nn.init.zeros_(self.bias)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x shape: [batch_size, n_features]
        # output shape: [batch_size, n_features, d_token]
        return x.unsqueeze(-1) * self.weight.unsqueeze(0) + self.bias.unsqueeze(0)


class CategoricalFeatureTokenizer(nn.Module):
    """
    Transforms categorical integer tokens into d-dimensional embedding vectors.
    """

    def __init__(self, cardinalities: List[int], d_token: int):
        super().__init__()
        self.embeddings = nn.ModuleList([
            nn.Embedding(cardinality, d_token) for cardinality in cardinalities
        ])

    def forward(self, x_cat: torch.Tensor) -> torch.Tensor:
        # x_cat shape: [batch_size, n_cat_features]
        # output shape: [batch_size, n_cat_features, d_token]
        tokens = [emb(x_cat[:, i]) for i, emb in enumerate(self.embeddings)]
        return torch.stack(tokens, dim=1)


class FTTransformer(nn.Module):
    """
    Full Feature Tokenizer Transformer for Tabular Payment Risk Scoring.
    Includes [CLS] token, Multi-Head Self-Attention layers, and MLP Risk Head.
    """

    def __init__(
        self,
        n_num_features: int = 14,
        cat_cardinalities: Optional[List[int]] = None,
        d_token: int = 64,
        n_blocks: int = 3,
        n_heads: int = 4,
        ffn_d_hidden: int = 128,
        ffn_dropout: float = 0.1,
        attention_dropout: float = 0.1,
        residual_dropout: float = 0.0,
    ):
        super().__init__()
        self.n_num_features = n_num_features
        self.cat_cardinalities = cat_cardinalities or []
        self.d_token = d_token

        # Tokenizers
        self.num_tokenizer = NumericalFeatureTokenizer(n_num_features, d_token) if n_num_features > 0 else None
        self.cat_tokenizer = CategoricalFeatureTokenizer(self.cat_cardinalities, d_token) if self.cat_cardinalities else None

        # [CLS] Token
        self.cls_token = nn.Parameter(torch.zeros(1, 1, d_token))
        nn.init.normal_(self.cls_token, std=0.02)

        # Transformer Encoder Blocks
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=d_token,
            nhead=n_heads,
            dim_feedforward=ffn_d_hidden,
            dropout=ffn_dropout,
            activation="gelu",
            batch_first=True,
            norm_first=True,
        )
        self.transformer_encoder = nn.TransformerEncoder(encoder_layer, num_layers=n_blocks)

        # Risk Classification Head
        self.head_norm = nn.LayerNorm(d_token)
        self.risk_head = nn.Sequential(
            nn.Linear(d_token, 32),
            nn.GELU(),
            nn.Dropout(0.1),
            nn.Linear(32, 1),
        )

    def forward(
        self,
        x_num: torch.Tensor,
        x_cat: Optional[torch.Tensor] = None,
    ) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        Returns:
            prob: Fraud probability in [0, 1] (shape: [batch_size, 1])
            embeddings: Dense [CLS] latent representation (shape: [batch_size, d_token])
        """
        batch_size = x_num.size(0)
        tokens = [self.cls_token.expand(batch_size, -1, -1)]

        if self.num_tokenizer is not None:
            tokens.append(self.num_tokenizer(x_num))

        if self.cat_tokenizer is not None and x_cat is not None:
            tokens.append(self.cat_tokenizer(x_cat))

        # Concatenate all feature tokens + [CLS]
        x = torch.cat(tokens, dim=1)

        # Pass through Transformer encoder blocks
        x = self.transformer_encoder(x)

        # Extract [CLS] token output
        cls_output = x[:, 0, :]
        cls_norm = self.head_norm(cls_output)

        logits = self.risk_head(cls_norm)
        prob = torch.sigmoid(logits)

        return prob, cls_output


class BinaryFocalLoss(nn.Module):
    """
    IEEE Transactions on Neural Networks (TNNLS) & Lin et al. Focal Loss.
    Addresses severe class imbalance in transaction fraud streams by dynamically
    down-weighting easy genuine transactions and focusing gradients on hard boundary attacks:
        FL(p_t) = -alpha_t * (1 - p_t)^gamma * log(p_t)
    """

    def __init__(self, alpha: float = 0.75, gamma: float = 2.0, reduction: str = "mean", eps: float = 1e-7):
        super().__init__()
        self.alpha = alpha
        self.gamma = gamma
        self.reduction = reduction
        self.eps = eps

    def forward(self, pred_probs: torch.Tensor, targets: torch.Tensor) -> torch.Tensor:
        # pred_probs in [0, 1], targets in {0, 1}
        pred_probs = torch.clamp(pred_probs, self.eps, 1.0 - self.eps)
        p_t = targets * pred_probs + (1.0 - targets) * (1.0 - pred_probs)
        alpha_t = targets * self.alpha + (1.0 - targets) * (1.0 - self.alpha)

        loss = -alpha_t * torch.pow(1.0 - p_t, self.gamma) * torch.log(p_t)

        if self.reduction == "mean":
            return loss.mean()
        elif self.reduction == "sum":
            return loss.sum()
        return loss

