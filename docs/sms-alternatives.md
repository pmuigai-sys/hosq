# SMS Service Alternatives (Kenya & Africa)

Twilio and Africa's Talking have documentation that often assumes a registered business entity. For independent developers or project-based work, the registration and blacklisting (spam filters) can be problematic.

## Recommended Low-Friction Alternatives

### 1. BulkSMS.com (Global / Shared Shortcode)
A reliable platform that allows pay-as-you-go credit with minimal overhead.

-   **Why it's better**:
    -   Requires simple ID verification (personal), not a full business registration.
    -   Uses **Shared Shortcodes** by default for many regions, which improves delivery to Safaricom/Airtel without needing to register a "Sender ID".
-   **Pricing**: Competitive pay-as-you-go rates.
-   **Website**: [bulksms.com](https://www.bulksms.com)

### 2. ClickSend
A modern SMS API provider known for its flexibility and ease of setup.

-   **Why it's better**:
    -   Offers **Shared Numbers** (Long Codes) and **Shortcodes**.
    -   Transparent pay-as-you-go pricing with no monthly subscription.
    -   Excellent documentation for various programming languages.
-   **Website**: [clicksend.com](https://www.clicksend.com)

### 3. Sema (Local Kenya)
Sema (by Advanta) is a developer-centric SMS gateway specifically for the Kenyan market.

-   **Why it's better**:
    -   Direct local support.
    -   Allows you to start sending using a **Shared Shortcode** (e.g., 22384) while you wait.
    -   Very simple REST API tailored for local use cases.
-   **Website**: [sema.co.ke](https://sema.co.ke)

---

## Strategy: Avoiding Blacklisting without Business Registration

If you are a student or an independent developer, the biggest hurdle is the **Sender ID** (e.g., "HOSPITAL"). Safaricom blocks any alphanumeric sender ID that hasn't been explicitly registered (which requires business docs).

**To bypass this:**
1.  **Use a Shared Shortcode**: Instead of your own name, the SMS will come from a number (e.g., 22123). Providers like BulkSMS and Sema offer this out of the box.
2.  **Verify your Account via Personal ID**: Most providers accept a scanned ID card or Passport for account verification instead of a Business Certificate.
3.  **Opt for Pay-as-you-go**: Avoid "monthly plans" or "subscriptions" that require recurring credit card charges.

---

## Comparison Summary

| Feature             | BulkSMS.com      | ClickSend      | Sema (Local)                      |
| :------------------ | :--------------- | :------------- | :-------------------------------- |
| **Kenyan Delivery** | High (Shortcode) | High           | **Excellent**                     |
| **Setup Friction**  | **Low**          | **Low**        | Medium                            |
| **Pay-as-you-go**   | Yes (Credits)    | Yes            | Yes                               |
| **Business Req**    | Personal ID OK   | Personal ID OK | Business docs preferred but ID OK |

**Author**: Peter Thairu Muigai
**Version**: 1.1
**Last Updated**: 2026-03-02
