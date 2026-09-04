# 🛠️ How to Integrate RazorVigil SDK in Under 5 Lines of Code

This guide shows how to drop RazorVigil into your existing checkout flow across **Node.js, Python FastAPI, Go, and Java Spring Boot** to block carding attacks before charges hit Razorpay.

---

## 📋 Prerequisites
- A running RazorVigil gateway at `http://127.0.0.1:8000` (or your cloud endpoint).
- Your `RAZORVIGIL_API_KEY` (optional for local development).

---

## 1. 🟢 Node.js / Express / TypeScript

### Step 1: Install the Package
```bash
npm install @geekluffy/razorvigil
```

### Step 2: Add Middleware to Your Checkout Route
```typescript
import express from 'express'
import { RazorVigil } from '@geekluffy/razorvigil'

const app = express()
const sentinel = new RazorVigil({ apiKey: process.env.RAZORVIGIL_API_KEY })

app.post('/api/checkout', async (req, res) => {
  const decision = await sentinel.evaluate(req.body)
  if (decision.tier === 'high_confidence_bot') {
    return res.status(403).json(decision.honeypot)
  }
  // Proceed with standard Razorpay order creation
})
```

---

## 2. 🐍 Python / FastAPI

### Step 1: Install the Package
```bash
pip install git+https://github.com/GeekLuffy/razorvigil.git#subdirectory=sdk/python
```

### Step 2: Add Sentinel Risk Gating
```python
import os
from fastapi import FastAPI, Response, status
from razorvigil import RazorVigilClient, CheckoutPayload

app = FastAPI()
sentinel = RazorVigilClient(api_key=os.getenv("RAZORVIGIL_API_KEY"))

@app.post("/checkout")
async def checkout(payload: CheckoutPayload):
    decision = await sentinel.evaluate_async(payload)
    if decision.tier == "high_confidence_bot":
        return Response(content=decision.honeypot_json, status_code=status.HTTP_403_FORBIDDEN)
    # Proceed to standard Razorpay order creation
```

---

## 3. 🔵 Go (Golang)

### Step 1: Install the Package
```bash
go get github.com/GeekLuffy/razorvigil/sdk/go
```

### Step 2: Wrap Your HTTP Handler
```go
package main

import (
    "net/http"
    "os"
    sentinel "github.com/GeekLuffy/razorvigil/sdk/go"
)

var shield = sentinel.NewClient(os.Getenv("RAZORVIGIL_API_KEY"))

func CheckoutHandler(w http.ResponseWriter, r *http.Request) {
    decision, err := shield.Evaluate(r.Context(), sentinel.CheckoutPayload{
        Amount: 2499.0, Currency: "INR", CardHash: "c_9981", DeviceFingerprint: "dev_41", KeystrokeEntropy: 2.85,
    })
    if err == nil && decision.Tier == "high_confidence_bot" {
        w.WriteHeader(http.StatusForbidden)
        w.Write(decision.HoneypotJSON())
        return
    }
    // Proceed to Razorpay Payment Gateway
}
```

---

## 4. ☕ Java / Spring Boot

### Step 1: Add Maven Dependency
```xml
<dependency>
    <groupId>com.github.geekluffy</groupId>
    <artifactId>razorvigil</artifactId>
    <version>1.0.0</version>
</dependency>
```

### Step 2: Add REST Controller Hook
```java
package com.merchant.controller;

import com.github.geekluffy.razorvigil.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;

@RestController
public class CheckoutController {
    private final RazorVigilClient sentinel = new RazorVigilClient(System.getenv("RAZORVIGIL_API_KEY"));

    @PostMapping("/checkout")
    public ResponseEntity<?> handleCheckout(@RequestBody CheckoutPayload payload) {
        Decision decision = sentinel.evaluate(payload);
        if (decision.isQuarantined()) return ResponseEntity.status(403).body(decision.getHoneypot());
        return ResponseEntity.ok(paymentService.process(payload));
    }
}
```

---

## ✅ Verification
Confirm your integration is working by sending a valid charge:
```bash
curl -i http://localhost:3000/api/checkout -d '{"amount": 1000, "card_hash": "c_valid"}'
```
You should observe an immediate HTTP 200 OK response with risk score $0.00$.

---

## 🔗 Related Documentation
- **[REST & WebSocket API Reference](file:///c:/Users/Owais/Documents/RazorPay/razorvigil/docs/reference-api.md)**
- **[How to Export WAF Rules](file:///c:/Users/Owais/Documents/RazorPay/razorvigil/docs/howto-waf-and-rules-export.md)**
