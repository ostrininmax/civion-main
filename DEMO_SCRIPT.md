# Cyprus Services - 3-5 Minute Demo Script

## Quick start
1. Run `npm run dev`.
2. Open `http://localhost:3000/settings` and ensure **Demo Mode** is enabled.
3. Open `http://localhost:3000/presenter`.
4. Press **N** to move through the scripted flow.

## Live walkthrough
1. **Dashboard / documents risk**
   - Show that Residence Permit is expiring soon.
   - Open `/wallet` and click the Residence Permit card.
   - Explain: data comes from registry sync (read-only), rights are derived from documents.

2. **Fast citizen action**
   - Show renewal/share controls in the drawer.
   - Emphasize: one wallet for documents, rights, reminders, and service readiness.

3. **Civic Card proof**
   - Open `/civic-card`.
   - Show rotating QR, privacy mode, and "What verifier sees".
   - Explain one-sentence value: instant proof without oversharing profile data.

4. **Authority check (split-screen)**
   - Click **Start authority check demo**.
   - In `/authority-check`, click **Scan QR**.
   - Show valid result, minimal attributes, countdown, and edge-case simulation buttons.

5. **Trust loop in real time**
   - Open `/timeline` and `/notifications`.
   - Show that verification created:
     - audit event,
     - timeline update,
     - citizen notification.
   - Final message: privacy-by-design + operational speed for public services.

## Keyboard controls in Presenter Mode
- `N` - next step
- `P` - previous step
- `R` - reset demo data/state
- `F` - open big QR view when civic card step is active
