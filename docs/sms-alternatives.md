# SMS Service Alternatives (Kenya & Africa)

Twilio is a global leader, but its trial restrictions and routing to African carriers (like Safaricom/Airtel) can be problematic for local projects. Below are the top recommended alternatives for the Kenyan market.

## 1. Africa's Talking (Recommended)
The industry standard for developers in Africa. They have direct integrations with Safaricom, Airtel, and Telkom.

- **Why it's better**: 
  - Extremely developer-friendly.
  - No "Verified Caller ID" restrictions for your own development numbers.
  - Better delivery rates to Safaricom/Airtel.
  - Active sandbox for testing without spending money.
- **Pricing**: Pay-as-you-go (approx. 0.8 KES to 1.0 KES per SMS).
- **Website**: [africastalking.com](https://africastalking.com)

## 2. Wingu SMS
A highly reliable local provider with a modern API and excellent dashboard.

- **Why it's better**:
  - 99.9% delivery rate to Kenyan networks.
  - Direct local support.
  - Very simple REST API.
- **Website**: [wingusms.com](https://wingusms.com)

## 3. Advanta Africa
A robust enterprise-grade solution that is very popular for bulk SMS and transactional alerts in Kenya.

- **Why it's better**:
  - Competitive pricing for bulk.
  - Support for custom alphanumeric Sender IDs.
- **Website**: [advantaafrica.com](https://advantaafrica.com)

---

## Comparison Summary

| Feature                | Twilio (Trial)             | Africa's Talking  | Wingu SMS         |
| :--------------------- | :------------------------- | :---------------- | :---------------- |
| **Kenyan Delivery**    | Poor/Restricted            | **Excellent**     | **Excellent**     |
| **Trial Restrictions** | High (Must verify every #) | Low (Use Sandbox) | Low               |
| **API Ease of Use**    | High                       | **High**          | High              |
| **Local Support**      | No                         | **Yes (Nairobi)** | **Yes (Nairobi)** |

---

## Migration Path to Africa's Talking

If you decide to switch, I have prepared a reference Supabase function for you. You would only need to:
1. Create an account at Africa's Talking.
2. Get your `API_KEY` and `USERNAME` (usually 'sandbox' or your app name).
3. Update your Supabase secrets.

**Author**: Peter Thairu Muigai  
**Version**: 1.0  
**Last Updated**: 2026-02-16
