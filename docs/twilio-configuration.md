# Twilio Configuration Guide

This guide provides detailed instructions on how to configure Twilio to send messages to specific recipients, especially when using a **Twilio Trial Account**.

## 1. Verified Caller IDs (Trial Accounts Only)

If you are using a Twilio Trial account, you **cannot** send SMS messages to any number you want. You are restricted to sending messages only to phone numbers that you have manually verified in the Twilio Console.

### Steps to Add a Verified Number:

1. **Log in to Twilio**: Go to the [Twilio Console](https://console.twilio.com/).
2. **Navigate to Verified Caller IDs**:
   - In the left sidebar, click on **Develop** > **Phone Numbers** > **Manage** > **Verified Caller IDs**.
   - Direct Link: [https://console.twilio.com/us1/develop/phone-numbers/manage/verified](https://console.twilio.com/us1/develop/phone-numbers/manage/verified)
3. **Add a New Number**:
   - click the **"Add a new Caller ID"** button (or the `+` icon).
   - Enter the phone number you want to receive messages (e.g., your personal phone).
   - Ensure you use the **E.164 format** (e.g., `+254700000000` or `+15551234567`).
4. **Choose Verification Method**:
   - Select **SMS** or **Phone Call**.
   - Twilio will send a code to that number.
5. **Enter the Verification Code**:
   - Enter the 6-digit code in the Twilio Console when prompted.
6. **Confirmation**: Once verified, the number will appear in the "Verified Caller IDs" list, and your site can now send messages to it.

## 2. Phone Number Formatting

Twilio requires phone numbers to be in the **E.164** format. This application automatically prepends a `+` if it's missing, but it's best to enter it correctly.

**Correct Format:** `+[Country Code][Area Code][Phone Number]`
- Example (Kenya): `+254712345678`
- Example (USA): `+15551234567`

## 3. Production Configuration (Upgrade)

To remove the restriction of verifying every recipient, you must upgrade your Twilio account:

1. **Add Balance**: Add a minimum of $20 to your Twilio project.
2. **Purchase a Number**: Ensure you have an active Twilio phone number with SMS capabilities.
3. **Remove Trial Branding**: Upgraded accounts do not include the "Sent from your Twilio trial account" prefix.

## 4. Troubleshooting

### "The number is not verified" Error
If your Supabase logs show an error like `The number [...] is not a verified caller ID`, it means:
- You are on a trial account.
- You have not added the recipient number to the **Verified Caller IDs** list.

### "Permission to send SMS has not been enabled"
This usually happens for international numbers. 
1. Go to **Messaging** > **Settings** > **Geo-Permissions**.
2. Search for the country (e.g., Kenya) and check the box to enable SMS.

---
**Author**: Peter Thairu Muigai  
**Version**: 1.0  
**Last Updated**: 2026-02-16
