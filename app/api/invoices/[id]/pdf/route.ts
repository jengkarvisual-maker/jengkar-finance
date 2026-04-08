import { NextResponse } from "next/server";
import { chromium } from "playwright";

import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    if (!invoice) {
      return new NextResponse("Invoice tidak ditemukan.", { status: 404 });
    }

    const paymentRows =
      invoice.transactions.length > 0
        ? invoice.transactions
            .map(
              (tx) => `
                <tr>
                  <td>${formatDate(tx.transactionDate)}</td>
                  <td>${tx.transactionNo}</td>
                  <td>${tx.description}</td>
                  <td>${formatCurrency(Number(tx.amountIn))}</td>
                </tr>
              `
            )
            .join("")
        : `
          <tr>
            <td colspan="4" style="text-align:center; color:#666;">Belum ada pembayaran</td>
          </tr>
        `;

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${invoice.invoiceNo}</title>
          <style>
            * {
              box-sizing: border-box;
            }

            body {
              font-family: Arial, sans-serif;
              color: #222;
              margin: 0;
              padding: 32px;
              background: white;
            }

            .sheet {
              max-width: 800px;
              margin: 0 auto;
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

            th,
            td {
              border-bottom: 1px solid #e5e5e5;
              padding: 10px 8px;
              text-align: left;
              font-size: 14px;
              vertical-align: top;
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
          </style>
        </head>
        <body>
          <div class="sheet">
            <div class="header">
              <div>
                <h1 class="title">INVOICE</h1>
                <div class="muted">${invoice.brand.name}</div>
              </div>

              <div>
                <div><strong>No:</strong> ${invoice.invoiceNo}</div>
                <div><strong>Tanggal:</strong> ${formatDate(invoice.invoiceDate)}</div>
                <div><strong>Jatuh tempo:</strong> ${formatDate(invoice.dueDate)}</div>
                <div style="margin-top:8px;">
                  <span class="badge">${invoice.status}</span>
                </div>
              </div>
            </div>

            <div class="grid section">
              <div class="card">
                <div class="muted">Ditagihkan kepada</div>
                <div><strong>${invoice.client.name}</strong></div>
                ${invoice.client.companyName ? `<div>${invoice.client.companyName}</div>` : ""}
                ${invoice.client.phone ? `<div>${invoice.client.phone}</div>` : ""}
                ${invoice.client.email ? `<div>${invoice.client.email}</div>` : ""}
              </div>

              <div class="card">
                <div class="muted">Project</div>
                <div><strong>${invoice.project?.name ?? "-"}</strong></div>
                ${
                  invoice.notes
                    ? `<div class="muted" style="margin-top:12px;">Catatan</div><div>${invoice.notes}</div>`
                    : ""
                }
              </div>
            </div>

            <div class="section">
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
                    <td>${invoice.project?.name ?? "Invoice"}</td>
                    <td>${invoice.status}</td>
                    <td>${formatCurrency(Number(invoice.downPayment))}</td>
                    <td>${formatCurrency(Number(invoice.amountPaid))}</td>
                    <td>${formatCurrency(Number(invoice.outstandingAmount))}</td>
                    <td>${formatCurrency(Number(invoice.totalAmount))}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="section">
              <div class="muted">Riwayat pembayaran</div>
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
                  ${paymentRows}
                </tbody>
              </table>
            </div>

            <div class="totals">
              <div class="totals-row">
                <span>Total invoice</span>
                <span>${formatCurrency(Number(invoice.totalAmount))}</span>
              </div>
              <div class="totals-row">
                <span>Sudah dibayar</span>
                <span>${formatCurrency(Number(invoice.amountPaid))}</span>
              </div>
              <div class="totals-row bold">
                <span>Sisa tagihan</span>
                <span>${formatCurrency(Number(invoice.outstandingAmount))}</span>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const browser = await chromium.launch({ headless: true });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "load" });

      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: {
          top: "20px",
          right: "20px",
          bottom: "20px",
          left: "20px",
        },
      });

      const pdf = new Uint8Array(pdfBuffer);

      return new NextResponse(pdf, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${invoice.invoiceNo}.pdf"`,
        },
      });
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error("PDF ROUTE ERROR:", error);
    return new NextResponse("Gagal membuat PDF.", { status: 500 });
  }
}