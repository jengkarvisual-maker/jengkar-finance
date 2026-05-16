import { NextResponse } from "next/server";
import { chromium } from "playwright";

import { getCurrentSession } from "@/lib/auth/session";
import { getInvoiceDisplayAmounts } from "@/lib/invoice-additional-items";
import {
  buildInvoicePdfFilename,
  escapeHtml,
  getBrandLogoDataUri,
} from "@/lib/invoice-documents";
import { canAccessFinanceWorkspace } from "@/lib/permissions";
import { getInvoiceById } from "@/lib/services/finance";
import { formatCurrency, formatDate } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentSession();

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!canAccessFinanceWorkspace(user)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const invoice = await getInvoiceById(user, id);

    if (!invoice) {
      return new NextResponse("Invoice tidak ditemukan.", { status: 404 });
    }

    const filename = buildInvoicePdfFilename(invoice);
    const displayAmounts = getInvoiceDisplayAmounts(invoice);
    const brandLogoDataUri = await getBrandLogoDataUri(invoice.brand);
    const brandFallbackLabel = escapeHtml(invoice.brand.name);
    const logoMarkup = brandLogoDataUri
      ? `<img src="${brandLogoDataUri}" alt="${brandFallbackLabel}" style="max-width: 180px; max-height: 68px; object-fit: contain;" />`
      : `<div style="font-size: 14px; color: #666;">${brandFallbackLabel}</div>`;
    const additionalItemsSection =
      invoice.additionalItems.length > 0
        ? `
            <div class="section">
              <div class="muted" style="margin-bottom: 8px;">Penambahan item & biaya</div>
              <table>
                <thead>
                  <tr>
                    <th>Nama item</th>
                    <th>Deskripsi</th>
                    <th>Qty</th>
                    <th>Harga satuan</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${invoice.additionalItems
                    .map(
                      (item) => `
                        <tr>
                          <td>${escapeHtml(item.name)}</td>
                          <td>${escapeHtml(item.description || item.notes || "-")}</td>
                          <td>${Number(item.quantity)}</td>
                          <td>${formatCurrency(Number(item.unitPrice))}</td>
                          <td>${formatCurrency(Number(item.totalAmount))}</td>
                        </tr>
                      `,
                    )
                    .join("")}
                </tbody>
              </table>
            </div>
          `
        : "";

    const paymentRows =
      invoice.transactions.length > 0
        ? invoice.transactions
            .map(
              (tx) => `
                <tr>
                  <td>${escapeHtml(formatDate(tx.transactionDate))}</td>
                  <td>${escapeHtml(tx.transactionNo)}</td>
                  <td>${escapeHtml(tx.description)}</td>
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
          <title>${escapeHtml(invoice.invoiceNo)}</title>
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
              gap: 24px;
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

            .logo-wrap {
              min-width: 180px;
              display: flex;
              justify-content: flex-end;
            }
          </style>
        </head>
        <body>
          <div class="sheet">
            <div class="header">
              <div>
                <h1 class="title">INVOICE</h1>
                <div class="muted">${brandFallbackLabel}</div>
              </div>

              <div style="text-align:right;">
                <div class="logo-wrap" style="margin-bottom: 14px;">${logoMarkup}</div>
                <div><strong>No:</strong> ${escapeHtml(invoice.invoiceNo)}</div>
                <div><strong>Tanggal:</strong> ${escapeHtml(formatDate(invoice.invoiceDate))}</div>
                <div><strong>Jatuh tempo:</strong> ${escapeHtml(formatDate(invoice.dueDate))}</div>
                <div style="margin-top:8px;">
                  <span class="badge">${escapeHtml(invoice.status)}</span>
                </div>
              </div>
            </div>

            <div class="grid section">
              <div class="card">
                <div class="muted">Ditagihkan kepada</div>
                <div><strong>${escapeHtml(invoice.client.name)}</strong></div>
                ${invoice.client.companyName ? `<div>${escapeHtml(invoice.client.companyName)}</div>` : ""}
                ${invoice.client.phone ? `<div>${escapeHtml(invoice.client.phone)}</div>` : ""}
                ${invoice.client.email ? `<div>${escapeHtml(invoice.client.email)}</div>` : ""}
                ${invoice.client.address ? `<div>${escapeHtml(invoice.client.address)}</div>` : ""}
              </div>

              <div class="card">
                <div class="muted">Project</div>
                <div><strong>${escapeHtml(invoice.project?.name ?? "-")}</strong></div>
                ${
                  invoice.notes
                    ? `<div class="muted" style="margin-top:12px;">Catatan</div><div>${escapeHtml(invoice.notes)}</div>`
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
                    <td>${escapeHtml(invoice.project?.name ?? `Invoice ${invoice.invoiceNo}`)}</td>
                    <td>${escapeHtml(invoice.status)}</td>
                    <td>${formatCurrency(Number(invoice.downPayment))}</td>
                    <td>${formatCurrency(Number(invoice.amountPaid))}</td>
                    <td>${formatCurrency(displayAmounts.outstandingDisplay)}</td>
                    <td>${formatCurrency(displayAmounts.baseTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            ${additionalItemsSection}

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
                <span>Total invoice awal</span>
                <span>${formatCurrency(displayAmounts.baseTotal)}</span>
              </div>
              <div class="totals-row">
                <span>Total tambahan</span>
                <span>${formatCurrency(displayAmounts.additionalTotal)}</span>
              </div>
              <div class="totals-row">
                <span>Grand total</span>
                <span>${formatCurrency(displayAmounts.grandTotal)}</span>
              </div>
              <div class="totals-row">
                <span>DP diterima</span>
                <span>${formatCurrency(Number(invoice.downPayment))}</span>
              </div>
              <div class="totals-row">
                <span>Sudah dibayar</span>
                <span>${formatCurrency(displayAmounts.amountPaid)}</span>
              </div>
              <div class="totals-row bold">
                <span>Sisa pembayaran</span>
                <span>${formatCurrency(displayAmounts.outstandingDisplay)}</span>
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
          "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        },
      });
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error("PDF ROUTE ERROR:", error);
    if (error instanceof Error && error.message.includes("akses")) {
      return new NextResponse("Kamu tidak punya akses ke invoice ini.", {
        status: 403,
      });
    }
    return new NextResponse("Gagal membuat PDF.", { status: 500 });
  }
}
