import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function InvoicePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      brand: true,
      client: true,
      project: true,
      transactions: {
        orderBy: { transactionDate: "asc" },
      },
    },
  });

  if (!invoice) notFound();

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body {
          font-family: Arial, sans-serif;
          color: #222;
          background: white;
        }
        .sheet {
          max-width: 800px;
          margin: 0 auto;
          padding: 32px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 32px;
        }
        .title {
          font-size: 28px;
          font-weight: 700;
          margin: 0 0 8px;
        }
        .muted {
          color: #666;
          font-size: 14px;
        }
        .section {
          margin-bottom: 24px;
        }
        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .card {
          border: 1px solid #ddd;
          border-radius: 12px;
          padding: 16px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 12px;
        }
        th, td {
          border-bottom: 1px solid #e5e5e5;
          padding: 10px 8px;
          text-align: left;
          font-size: 14px;
        }
        th {
          background: #f7f7f7;
        }
        .totals {
          margin-top: 24px;
          width: 320px;
          margin-left: auto;
        }
        .totals-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #eee;
        }
        .totals-row.bold {
          font-weight: 700;
          font-size: 16px;
        }
        .badge {
          display: inline-block;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid #ccc;
          font-size: 12px;
        }
        @media print {
          .sheet {
            padding: 0;
          }
        }
      `}</style>

      <div className="sheet">
        <div className="header">
          <div>
            <h1 className="title">INVOICE</h1>
            <div className="muted">{invoice.brand.name}</div>
          </div>

          <div>
            <div><strong>No:</strong> {invoice.invoiceNo}</div>
            <div><strong>Tanggal:</strong> {formatDate(invoice.invoiceDate)}</div>
            <div><strong>Jatuh tempo:</strong> {formatDate(invoice.dueDate)}</div>
            <div style={{ marginTop: 8 }}>
              <span className="badge">{invoice.status}</span>
            </div>
          </div>
        </div>

        <div className="grid section">
          <div className="card">
            <div className="muted">Ditagihkan kepada</div>
            <div><strong>{invoice.client.name}</strong></div>
            {invoice.client.companyName ? <div>{invoice.client.companyName}</div> : null}
            {invoice.client.phone ? <div>{invoice.client.phone}</div> : null}
            {invoice.client.email ? <div>{invoice.client.email}</div> : null}
          </div>

          <div className="card">
            <div className="muted">Project</div>
            <div><strong>{invoice.project?.name ?? "-"}</strong></div>
            {invoice.notes ? (
              <>
                <div className="muted" style={{ marginTop: 12 }}>Catatan</div>
                <div>{invoice.notes}</div>
              </>
            ) : null}
          </div>
        </div>

        <div className="section">
          <table>
            <thead>
              <tr>
                <th>Deskripsi</th>
                <th>Status</th>
                <th>DP</th>
                <th>Sudah dibayar</th>
                <th>Sisa</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{invoice.project?.name ?? "Invoice"}</td>
                <td>{invoice.status}</td>
                <td>{formatCurrency(Number(invoice.downPayment))}</td>
                <td>{formatCurrency(Number(invoice.amountPaid))}</td>
                <td>{formatCurrency(Number(invoice.outstandingAmount))}</td>
                <td>{formatCurrency(Number(invoice.totalAmount))}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {invoice.transactions.length > 0 ? (
          <div className="section">
            <div className="muted">Riwayat pembayaran</div>
            <table>
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>No. Transaksi</th>
                  <th>Deskripsi</th>
                  <th>Nominal</th>
                </tr>
              </thead>
              <tbody>
                {invoice.transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>{formatDate(tx.transactionDate)}</td>
                    <td>{tx.transactionNo}</td>
                    <td>{tx.description}</td>
                    <td>{formatCurrency(Number(tx.amountIn))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <div className="totals">
          <div className="totals-row">
            <span>Total invoice</span>
            <span>{formatCurrency(Number(invoice.totalAmount))}</span>
          </div>
          <div className="totals-row">
            <span>Sudah dibayar</span>
            <span>{formatCurrency(Number(invoice.amountPaid))}</span>
          </div>
          <div className="totals-row bold">
            <span>Sisa tagihan</span>
            <span>{formatCurrency(Number(invoice.outstandingAmount))}</span>
          </div>
        </div>
      </div>
    </>
  );
}