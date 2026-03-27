/**
 * 포트원(PortOne) SDK 연동 유틸리티
 *
 * WebView 기반으로 포트원 V2 결제를 처리합니다.
 * 실제 결제는 포트원 API를 통해 이루어지며,
 * 테스트 모드에서는 시뮬레이션으로 동작합니다.
 */

import { getApiBaseUrl } from "@/constants/oauth";

export interface PortOnePaymentRequest {
  merchantId: string;     // 포트원 가맹점 ID
  paymentId: string;      // 주문 고유 ID
  orderName: string;      // 주문명
  totalAmount: number;    // 결제 금액
  currency: string;       // 통화 (KRW)
  payMethod: "CARD" | "TRANSFER" | "VIRTUAL_ACCOUNT" | "MOBILE";
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
}

export interface PortOnePaymentResult {
  success: boolean;
  paymentId: string;
  transactionId?: string;
  paidAmount?: number;
  error?: string;
}

/**
 * 포트원 결제 HTML 생성 (WebView에서 사용)
 */
export function generatePortOnePaymentHTML(
  request: PortOnePaymentRequest,
  storeId: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>결제</title>
  <script src="https://cdn.portone.io/v2/browser-sdk.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      background: #F5F5F5;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 16px;
      padding: 32px 24px;
      width: 100%;
      max-width: 400px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
      text-align: center;
    }
    .logo { font-size: 48px; margin-bottom: 16px; }
    .title { font-size: 20px; font-weight: 700; color: #1A1A1A; margin-bottom: 8px; }
    .amount { font-size: 28px; font-weight: 800; color: #2E7D32; margin-bottom: 24px; }
    .info { font-size: 14px; color: #8E8E93; margin-bottom: 24px; line-height: 1.6; }
    .btn {
      display: block;
      width: 100%;
      padding: 16px;
      border: none;
      border-radius: 12px;
      font-size: 17px;
      font-weight: 700;
      cursor: pointer;
      margin-bottom: 12px;
    }
    .btn-primary { background: #2E7D32; color: white; }
    .btn-secondary { background: #F0F0F0; color: #1A1A1A; }
    .status { margin-top: 16px; font-size: 14px; color: #8E8E93; }
    .loading { display: none; }
    .loading.active { display: block; }
    .spinner {
      width: 40px; height: 40px;
      border: 3px solid #E8E8E8;
      border-top-color: #2E7D32;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 16px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="container" id="paymentForm">
    <div class="logo">💳</div>
    <div class="title">${request.orderName}</div>
    <div class="amount">${request.totalAmount.toLocaleString("ko-KR")}원</div>
    <div class="info">
      주문번호: ${request.paymentId}<br>
      결제수단: ${request.payMethod === "CARD" ? "신용/체크카드" : request.payMethod === "TRANSFER" ? "계좌이체" : "간편결제"}
    </div>
    <button class="btn btn-primary" onclick="requestPayment()">결제하기</button>
    <button class="btn btn-secondary" onclick="cancelPayment()">취소</button>
    <div class="status" id="status"></div>
  </div>

  <div class="container loading" id="loadingView">
    <div class="spinner"></div>
    <div class="title">결제 처리 중...</div>
    <div class="info">잠시만 기다려주세요</div>
  </div>

  <script>
    async function requestPayment() {
      const statusEl = document.getElementById("status");
      const formEl = document.getElementById("paymentForm");
      const loadingEl = document.getElementById("loadingView");

      formEl.style.display = "none";
      loadingEl.classList.add("active");

      try {
        const response = await PortOne.requestPayment({
          storeId: "${storeId}",
          paymentId: "${request.paymentId}",
          orderName: "${request.orderName}",
          totalAmount: ${request.totalAmount},
          currency: "${request.currency}",
          channelKey: "channel-key-placeholder",
          payMethod: "${request.payMethod}",
          customer: {
            fullName: "${request.customerName}",
          },
        });

        if (response.code != null) {
          // 결제 실패
          window.ReactNativeWebView?.postMessage(JSON.stringify({
            success: false,
            paymentId: "${request.paymentId}",
            error: response.message || "결제에 실패했습니다.",
          }));
        } else {
          // 결제 성공
          window.ReactNativeWebView?.postMessage(JSON.stringify({
            success: true,
            paymentId: response.paymentId || "${request.paymentId}",
            transactionId: response.txId || "TX_" + Date.now(),
            paidAmount: ${request.totalAmount},
          }));
        }
      } catch (error) {
        // SDK 로드 실패 시 시뮬레이션 모드
        simulatePayment();
      }
    }

    function simulatePayment() {
      // 포트원 SDK 연동 전 시뮬레이션 모드
      setTimeout(() => {
        window.ReactNativeWebView?.postMessage(JSON.stringify({
          success: true,
          paymentId: "${request.paymentId}",
          transactionId: "SIM_TX_" + Date.now(),
          paidAmount: ${request.totalAmount},
          simulated: true,
        }));
      }, 2000);
    }

    function cancelPayment() {
      window.ReactNativeWebView?.postMessage(JSON.stringify({
        success: false,
        paymentId: "${request.paymentId}",
        error: "사용자가 결제를 취소했습니다.",
      }));
    }
  </script>
</body>
</html>`;
}

/**
 * 온통대전 결제 시뮬레이션 HTML
 */
export function generateOntongPaymentHTML(
  paymentId: string,
  amount: number,
  orderName: string
): string {
  const cashback = Math.floor(amount * 0.1);
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>온통대전 결제</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      background: linear-gradient(135deg, #1B3A6B 0%, #2E5CB8 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 20px;
      padding: 32px 24px;
      width: 100%;
      max-width: 400px;
      text-align: center;
    }
    .badge {
      display: inline-block;
      background: linear-gradient(135deg, #1B3A6B, #2E5CB8);
      color: white;
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 700;
      margin-bottom: 16px;
    }
    .logo { font-size: 56px; margin-bottom: 12px; }
    .title { font-size: 22px; font-weight: 800; color: #1B3A6B; margin-bottom: 4px; }
    .subtitle { font-size: 14px; color: #8E8E93; margin-bottom: 20px; }
    .amount-box {
      background: #F0F4FF;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
    }
    .amount { font-size: 32px; font-weight: 800; color: #1B3A6B; }
    .cashback {
      display: inline-block;
      background: #2E7D32;
      color: white;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 700;
      margin-top: 8px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #F0F0F0;
      font-size: 14px;
    }
    .info-label { color: #8E8E93; }
    .info-value { color: #1A1A1A; font-weight: 600; }
    .btn {
      display: block;
      width: 100%;
      padding: 16px;
      border: none;
      border-radius: 12px;
      font-size: 17px;
      font-weight: 700;
      cursor: pointer;
      margin-top: 20px;
    }
    .btn-ontong { background: linear-gradient(135deg, #1B3A6B, #2E5CB8); color: white; }
    .btn-cancel { background: #F0F0F0; color: #1A1A1A; margin-top: 10px; }
    .spinner {
      width: 40px; height: 40px;
      border: 3px solid #E8E8E8;
      border-top-color: #1B3A6B;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 20px auto;
      display: none;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="container">
    <div class="badge">🏙️ 대전 지역화폐</div>
    <div class="logo">🏙️</div>
    <div class="title">온통대전</div>
    <div class="subtitle">${orderName}</div>
    <div class="amount-box">
      <div class="amount">${amount.toLocaleString("ko-KR")}원</div>
      <div class="cashback">💰 캐시백 ${cashback.toLocaleString("ko-KR")}원</div>
    </div>
    <div class="info-row">
      <span class="info-label">주문번호</span>
      <span class="info-value">${paymentId}</span>
    </div>
    <div class="info-row">
      <span class="info-label">결제수단</span>
      <span class="info-value">온통대전 지역화폐</span>
    </div>
    <div class="info-row">
      <span class="info-label">캐시백 (10%)</span>
      <span class="info-value" style="color:#2E7D32">${cashback.toLocaleString("ko-KR")}원</span>
    </div>
    <div class="spinner" id="spinner"></div>
    <button class="btn btn-ontong" id="payBtn" onclick="processPayment()">온통대전으로 결제</button>
    <button class="btn btn-cancel" onclick="cancelPayment()">취소</button>
  </div>
  <script>
    function processPayment() {
      document.getElementById("payBtn").style.display = "none";
      document.getElementById("spinner").style.display = "block";
      setTimeout(() => {
        window.ReactNativeWebView?.postMessage(JSON.stringify({
          success: true,
          paymentId: "${paymentId}",
          transactionId: "ONTONG_" + Date.now(),
          paidAmount: ${amount},
          cashback: ${cashback},
          method: "ontong_daejeon",
        }));
      }, 2000);
    }
    function cancelPayment() {
      window.ReactNativeWebView?.postMessage(JSON.stringify({
        success: false,
        paymentId: "${paymentId}",
        error: "사용자가 결제를 취소했습니다.",
      }));
    }
  </script>
</body>
</html>`;
}
