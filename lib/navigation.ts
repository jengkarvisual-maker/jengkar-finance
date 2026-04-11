import {
  BarChart3,
  Building2,
  CircleDollarSign,
  CreditCard,
  FileBarChart2,
  KeyRound,
  LayoutDashboard,
  Package2,
  ReceiptText,
  Users2,
  WalletCards,
} from "lucide-react";

export const sidebarSections = [
  {
    label: "Overview",
    items: [
      {
        title: "Dashboard Utama",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        title: "Dashboard per Brand",
        href: "/dashboard/brands/the-photoworks",
        icon: BarChart3,
      },
    ],
  },
  {
    label: "Operasional",
    items: [
      {
        title: "Transaksi",
        href: "/transactions",
        icon: CircleDollarSign,
      },
      {
        title: "Piutang",
        href: "/receivables",
        icon: ReceiptText,
      },
      {
        title: "Hutang Vendor",
        href: "/payables",
        icon: WalletCards,
      },
      {
        title: "Aset",
        href: "/assets",
        icon: Package2,
      },
      {
        title: "Project / Event",
        href: "/projects",
        icon: Building2,
      },
    ],
  },
  {
    label: "Master Data",
    items: [
      {
        title: "Brand",
        href: "/master/brands",
        icon: Building2,
      },
      {
        title: "Chart of Accounts",
        href: "/master/accounts",
        icon: CreditCard,
      },
      {
        title: "Clients",
        href: "/master/clients",
        icon: Users2,
      },
      {
        title: "Vendors",
        href: "/master/vendors",
        icon: Users2,
      },
      {
        title: "Metode Pembayaran",
        href: "/master/payment-methods",
        icon: CreditCard,
      },
      {
        title: "Kategori Transaksi",
        href: "/master/categories",
        icon: ReceiptText,
      },
      {
        title: "User Internal",
        href: "/master/users",
        icon: Users2,
      },
    ],
  },
  {
    label: "Akun",
    items: [
      {
        title: "Keamanan Akun",
        href: "/account/security",
        icon: KeyRound,
      },
    ],
  },
  {
    label: "Laporan",
    items: [
      {
        title: "Laba Rugi",
        href: "/reports/profit-loss",
        icon: FileBarChart2,
      },
      {
        title: "Arus Kas",
        href: "/reports/cash-flow",
        icon: FileBarChart2,
      },
      {
        title: "Rekap Transaksi",
        href: "/reports/transactions",
        icon: FileBarChart2,
      },
      {
        title: "Rekap Piutang",
        href: "/reports/receivables",
        icon: FileBarChart2,
      },
      {
        title: "Rekap Hutang",
        href: "/reports/payables",
        icon: FileBarChart2,
      },
      {
        title: "Ringkasan Aset",
        href: "/reports/assets",
        icon: FileBarChart2,
      },
    ],
  },
] as const;
