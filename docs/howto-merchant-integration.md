# 🛠️ How to Integrate RazorShield SDK in Under 5 Lines of Code

This guide shows how to drop RazorShield Sentinel into your existing checkout flow across **Node.js, Python FastAPI, Go, and Java Spring Boot** to block carding attacks before charges hit Razorpay.

---

## 📋 Prerequisites
- A running RazorShield Sentinel gateway at `http://127.0.0.1:8000` (or your cloud endpoint).
- Your `RAZORSHIELD_API_KEY` (optional for local development).

---

## 1. 🟢 Node.js / Express / TypeScript

### Step 1: Install the Package
```bash
npm install @geekluffy/razorshield-sentinel
```

### Step 2: Add Middleware to Your Checkout Route
```typescript
import express from 'express'
import { RazorShieldSentinel } from '@geekluffy/razorshield-sentinel'

const app = express()
const sentinel = new RazorShieldSentinel({ apiKey: process.env.RAZORSHIELD_API_KEY })

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
pip install git+https://github.com/GeekLuffy/razorshield-sentinel.git#subdirectory=sdk/python
```

### Step 2: Add Sentinel Risk Gating
```python
import os
from fastapi import FastAPI, Response, status
from razorshield_sentinel import RazorShieldClient, CheckoutPayload

app = FastAPI()
sentinel = RazorShieldClient(api_key=os.getenv("RAZORSHIELD_API_KEY"))

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
go get github.com/GeekLuffy/razorshield-sentinel/sdk/go
```

### Step 2: Wrap Your HTTP Handler
```go
package main

import (
    "net/http"
    "os"
    sentinel "github.com/GeekLuffy/razorshield-sentinel/sdk/go"
)

var shield = sentinel.NewClient(os.Getenv("RAZORSHIELD_API_KEY"))

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
    <artifactId>razorshield-sentinel</artifactId>
    <version>1.0.0</version>
</dependency>
```

### Step 2: Add REST Controller Hook
```java
package com.merchant.controller;

import com.github.geekluffy.razorshield.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;

@RestController
public class CheckoutController {
    private final RazorShieldClient sentinel = new RazorShieldClient(System.getenv("RAZORSHIELD_API_KEY"));

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
- **[REST & WebSocket API Reference](file:///c:/Users/Owais/Documents/RazorPay/razorshield/docs/reference-api.md)**
- **[How to Export WAF Rules](file:///c:/Users/Owais/Documents/RazorPay/razorshield/docs/howto-waf-and-rules-export.md)**
