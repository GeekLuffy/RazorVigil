// Package razorvigil provides the official Go client for RazorVigil payment defense.
package razorvigil

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

type CheckoutPayload struct {
	TransactionID     string  `json:"transaction_id,omitempty"`
	Amount            float64 `json:"amount"`
	Currency          string  `json:"currency"`
	MerchantID        string  `json:"merchant_id,omitempty"`
	CardHash          string  `json:"card_hash"`
	DeviceFingerprint string  `json:"device_fingerprint"`
	IPHash            string  `json:"ip_hash,omitempty"`
	KeystrokeEntropy  float64 `json:"keystroke_entropy"`
	MouseJitterScore  float64 `json:"mouse_jitter_score,omitempty"`
	JA3UAMismatch     bool    `json:"ja3_ua_mismatch,omitempty"`
	ASNType           string  `json:"asn_type,omitempty"`
}

type Decision struct {
	TransactionID string                 `json:"transaction_id"`
	Decision      string                 `json:"decision"`
	Tier          string                 `json:"tier"`
	RiskScore     float64                `json:"risk_score"`
	ConformalSet  []string               `json:"conformal_set"`
	Honeypot      map[string]interface{} `json:"honeypot,omitempty"`
}

func (d *Decision) IsBot() bool {
	return d.Tier == "high_confidence_bot" || d.Decision == "honeypot"
}

func (d *Decision) HoneypotJSON() []byte {
	b, _ := json.Marshal(d.Honeypot)
	return b
}

type Client struct {
	APIKey     string
	BaseURL    string
	HTTPClient *http.Client
}

func NewClient(apiKey string) *Client {
	return &Client{
		APIKey:  apiKey,
		BaseURL: "http://127.0.0.1:8000",
		HTTPClient: &http.Client{
			Timeout: 15 * time.Millisecond,
		},
	}
}

func (c *Client) Evaluate(ctx context.Context, payload CheckoutPayload) (*Decision, error) {
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", fmt.Sprintf("%s/checkout", c.BaseURL), bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	if c.APIKey != "" {
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.APIKey))
	}

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		// Fail-open for sub-15ms merchant resilience
		return &Decision{Decision: "allow", Tier: "safe", RiskScore: 0.0}, nil
	}
	defer resp.Body.Close()

	var decision Decision
	if err := json.NewDecoder(resp.Body).Decode(&decision); err != nil {
		return nil, err
	}

	return &decision, nil
}
