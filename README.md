# Vegetable CRM

A comprehensive vegetable business management system for farmers and vendors, built with Next.js 14, TypeScript, MongoDB, and IndexedDB for offline-first functionality.

## Features

### 🔐 Authentication
- Email/password authentication with NextAuth.js
- Role-based access control (Admin, Vendor, Farmer)
- Secure session management with JWT

### 👨‍🌾 Farmer Portal
- Dashboard with earnings overview
- View sales history
- Track settlements and payments
- Supply entry management
- Profile management

### 🏪 Vendor Portal
- **Master Data Management**
  - Customer Master (with commission rates, hamali charges)
  - Farmer Master (with bank details, crop types)
  - Vegetable Master (categories, units, default prices)

- **Sales Bill Module**
  - One farmer → Multiple buyers workflow
  - Automatic calculation of commission, hamali, market fee
  - Real-time net payable calculation
  - PDF bill generation

- **Cash Book**
  - Receipt vouchers (Customer payments)
  - Payment vouchers (Farmer settlements)
  - Bill-wise partial settlements
  - Kasar (discount) adjustments

- **Reports**
  - Customer Balance Report
  - Farmer Payable Report
  - Daily Sales Report
  - Vegetable-wise Report
  - PDF export

### 👨‍💼 Admin Portal
- User management (approve, deactivate, delete)
- System monitoring dashboard
- Audit logs
- Database backup management

### 📱 Progressive Web App (PWA)
- Installable on mobile devices
- Offline-first with IndexedDB
- Background sync when online
- Push notifications ready

### 🌙 Dark Mode
- System preference detection
- Manual toggle
- Persistent preference

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS, HeadlessUI
- **Authentication**: NextAuth.js 4
- **Database**: MongoDB with Mongoose
- **Offline Storage**: IndexedDB (via `idb` library)
- **State Management**: React Context, Zustand
- **PDF Generation**: jsPDF, jspdf-autotable
- **Icons**: React Icons
- **Notifications**: React Hot Toast
- **Date Handling**: date-fns

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/vegetable-crm.git
cd vegetable-crm
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env.local
```

4. Update `.env.local` with your values:
```env
MONGODB_URI=mongodb://localhost:27017/vegetable-crm
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

### Building for Production

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── admin/             # Admin dashboard pages
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── farmer/            # Farmer dashboard pages
│   ├── vendor/            # Vendor dashboard pages
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Landing page
├── components/
│   ├── layout/            # Layout components
│   └── ui/                # Reusable UI components
├── hooks/                 # Custom React hooks
├── lib/                   # Utility functions
├── models/                # MongoDB schemas
├── offline/               # IndexedDB & sync logic
├── providers/             # Context providers
└── types/                 # TypeScript types
```

## API Routes

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/api/auth/[...nextauth]` | GET, POST | Authentication |
| `/api/auth/signup` | POST | User registration |
| `/api/farmers` | GET, POST | Farmer CRUD |
| `/api/farmers/[id]` | GET, PUT, DELETE | Single farmer |
| `/api/customers` | GET, POST | Customer CRUD |
| `/api/customers/[id]` | GET, PUT, DELETE | Single customer |
| `/api/vegetables` | GET, POST | Vegetable CRUD |
| `/api/vegetables/[id]` | GET, PUT, DELETE | Single vegetable |
| `/api/sales-bills` | GET, POST | Sales bill CRUD |
| `/api/sales-bills/[id]` | GET, PUT, DELETE | Single bill |
| `/api/payments` | GET, POST | Payment CRUD |
| `/api/payments/[id]` | GET, DELETE | Single payment |
| `/api/sync` | GET, POST | Offline sync |

## Financial Year

- Financial year runs from April 1 to March 31
- Format: `2024-25` (April 2024 to March 2025)
- All data is isolated by financial year
- FY locking available for closed years

## Offline Support

The application uses IndexedDB for offline storage:

1. **Local Storage**: All masters and transactions are stored locally
2. **Sync Queue**: Changes made offline are queued for sync
3. **Auto Sync**: When online, data syncs automatically every 30 seconds
4. **Conflict Resolution**: Last-write-wins with manual override option

## Mobile Responsiveness

- Minimum touch target: 44px × 44px
- Responsive breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- Bottom sheet navigation on mobile
- Swipe gestures for common actions

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, email support@vegcrm.com or join our Slack channel.

---

Built with ❤️ for the vegetable trading community
