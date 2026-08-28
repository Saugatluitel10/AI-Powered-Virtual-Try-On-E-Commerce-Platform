# prashna.clo

`prashna.clo` is a zero-cost, local-first fashion e-commerce college project. The complete shopping experience runs in the Next.js frontend without a hosted database, paid API, payment credentials, Redis, cloud storage, or cloud AI.

## Requirements

- Node.js 20 or newer
- pnpm 9 or newer; pnpm 11.19.0 is recommended
- A current version of Chrome, Edge, Firefox, or Safari
- About 2 GB of free disk space for dependencies

The project uses Next.js 16, React 19, TypeScript, Tailwind CSS, Zustand, TanStack Query, and Lucide icons. All required JavaScript packages are installed by pnpm.

## Install

Clone or download the repository, open a terminal in its root directory, and run:

```bash
corepack enable
corepack prepare pnpm@11.19.0 --activate
pnpm install
```

If pnpm is already installed, only `pnpm install` is required.

No `.env` file, API key, database migration, seed command, or external service is required for the core application. Product data and images are included in the repository.

## Run Locally

From the repository root:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Stop the server with `Ctrl+C`.

If port 3000 is already being used, run:

```bash
pnpm --filter frontend exec next dev --port 3001
```

Then open `http://localhost:3001`.

## Open On Another Device

The laptop running the project and the second device must be connected to the same Wi-Fi or local network.

1. Start the app on the laptop with `pnpm dev`.
2. Look for the `Network` address printed in the terminal, such as `http://192.168.1.67:3000`.
3. Open that address in the browser on the phone, tablet, or other computer.
4. Allow incoming network access if the laptop firewall asks for permission.

If Next.js does not print a network address, start it explicitly on all network interfaces:

```bash
pnpm --filter frontend exec next dev --hostname 0.0.0.0 --port 3000
```

Find the laptop's local IP address when needed:

```bash
# macOS, usually Wi-Fi
ipconfig getifaddr en0

# Linux
hostname -I

# Windows
ipconfig
```

Use `http://LAPTOP_IP:3000` on the second device. For example: `http://192.168.1.67:3000`.

Accounts, carts, and orders are stored separately in each browser. Signing in or adding an item on one device does not copy that local data to another device.

### Camera On Other Devices

Live camera access uses `navigator.mediaDevices.getUserMedia()`. It works on `localhost`, but many browsers block camera permission on a plain `http://192.168.x.x` address because it is not a secure context. Image upload continues to work over the local network and is the recommended no-cost fallback. This restriction comes from the browser, not from `prashna.clo`.

## Demo Account

- Email: `demo@prashna.clo`
- Password: `Demo@123`

New account signup also works. Accounts use salted PBKDF2-SHA-256 password hashes and are stored only in the current browser for this local demonstration. Existing local accounts created by an older version are upgraded after a successful login.

## Features

- 30 realistic products with matching local images and NPR prices
- Working category, gender, color, size, style, search, and price filters
- Featured, price, and alphabetical product sorting
- Product details, size selection, and persistent local cart
- Local checkout, confirmation, and order history
- Fonepay, eSewa, Khalti, card, and Cash on Delivery demonstrations
- Browser camera capture and JPG, JPEG, PNG, or WebP upload
- Local image analysis and catalogue-based clothing recommendations
- Responsive desktop, tablet, and mobile layouts

All online payment flows are simulations. No real transaction is processed, and card values are never stored or transmitted.

The recommendation feature is described accurately as **AI-assisted clothing recommendation using image analysis and product matching**. Colour and tone are calculated from the selected image in the browser. Men, Women, and Unisex catalogue sections are always matched strictly. Automatic section suggestions use explicit image metadata when available and otherwise fall back to Unisex instead of guessing a person's gender from appearance; the user can override the section at any time.

## Commands

```bash
pnpm dev          # Start the frontend development server
pnpm lint         # Run frontend lint checks
pnpm type-check   # Run frontend TypeScript checks
pnpm test         # Run the repository test suite
pnpm build        # Create the frontend production build
```

To validate every workspace package, including the optional API, SDK, and embed widget:

```bash
pnpm exec turbo build
```

The optional API and older third-party integration code remain available for future development, but they are not started by `pnpm dev` and are not required for the local shopping application.

The repository test suite includes 20 frontend tests for catalogue integrity, filters, sorting, image validation and analysis, recommendation matching, authentication, cart state, and orders, plus 125 backend tests for the optional API.

## Troubleshooting

- **The page does not open:** confirm the terminal still shows the Next.js server as ready.
- **Port 3000 is busy:** use the port 3001 command above.
- **Another device cannot connect:** verify both devices are on the same network and allow Node.js through the laptop firewall.
- **Camera permission is denied:** enable camera permission for the site, close other camera apps, or use Upload Photo.
- **Local data looks empty:** browser accounts, carts, and orders are device-specific and browser-specific.
- **Dependencies behave unexpectedly:** delete `node_modules`, then run `pnpm install` again.
