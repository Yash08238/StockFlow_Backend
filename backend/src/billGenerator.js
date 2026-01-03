const PDFDocument = require("pdfkit");

function generateBillPDF(billData) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 30,
        size: "A4",
      });

      const buffers = [];
      doc.on("data", (buffer) => buffers.push(buffer));
      doc.on("end", () => resolve(Buffer.concat(buffers)));

      doc.on("error", (err) => {
        reject(err);
      });

      // --- Compact Header (smaller) ---
      doc.rect(0, 0, doc.page.width, 80).fill("#1D546D");

      doc
        .fillColor("white")
        .fontSize(20)
        .font("Helvetica-Bold")
        .text("INVOICE", 30, 20)
        .fontSize(8)
        .font("Helvetica")
        .text("Invoice #: " + Date.now(), 350, 25, { align: "right" })
        .text("Date: " + new Date().toLocaleDateString(), 350, 38, {
          align: "right",
        });

      // Customer on header
      doc
        .fillColor("white")
        .fontSize(8)
        .font("Helvetica-Bold")
        .text("BILL TO:", 30, 52)
        .font("Helvetica")
        .fontSize(9)
        .text(
          billData.customerName.toUpperCase() + " | " + billData.customermail,
          75,
          52
        );

      // --- Table Header ---
      const tableTop = 95;
      doc.rect(30, tableTop, 535, 18).fill("#e8e8e8");

      doc.fillColor("#333333").font("Helvetica-Bold").fontSize(8);
      generateTableRow(
        doc,
        tableTop + 5,
        "PRODUCT",
        "UNIT PRICE (INR)",
        "QTY",
        "AMOUNT (INR)"
      );
      doc.font("Helvetica");

      // --- Table Rows ---
      let y = tableTop + 22;
      const rowHeight = 18;

      billData.sales.forEach((sale, index) => {
        // Alternate row background
        if (index % 2 === 0) {
          doc.rect(30, y - 2, 535, rowHeight).fill("#fafafa");
        }

        doc.fillColor("#333333").fontSize(9);
        doc.text(sale.product.productName, 35, y + 2, { width: 180 });
        doc.text("Rs. " + sale.price.toFixed(2), 220, y + 2, {
          width: 90,
          align: "right",
        });
        doc.text(sale.quantity.toString(), 320, y + 2, {
          width: 60,
          align: "center",
        });
        doc
          .font("Helvetica-Bold")
          .text("Rs. " + sale.amount.toFixed(2), 390, y + 2, {
            width: 170,
            align: "right",
          })
          .font("Helvetica");

        y += rowHeight;
      });

      // --- Divider ---
      doc
        .strokeColor("#ccc")
        .lineWidth(0.5)
        .moveTo(30, y + 3)
        .lineTo(565, y + 3)
        .stroke();

      // --- Total Section ---
      const subtotal =
        billData.subtotal ||
        billData.sales.reduce((total, sale) => total + sale.amount, 0);
      const discountAmount = billData.discountAmount || 0;
      const totalAmount = subtotal - discountAmount;

      y += 10;

      // Subtotal
      doc.fillColor("#333333").font("Helvetica").fontSize(9);
      doc.text("Subtotal:", 300, y, { align: "right", width: 80 });
      doc.text("Rs. " + subtotal.toFixed(2), 390, y, {
        width: 165,
        align: "right",
      });

      y += 15;
      // Discount
      if (discountAmount > 0) {
        doc
          .fillColor("#e53e3e")
          .text(`Discount (${billData.discountPercentage}%):`, 300, y, {
            align: "right",
            width: 80,
          });
        doc.text("- Rs. " + discountAmount.toFixed(2), 390, y, {
          width: 165,
          align: "right",
        });
        y += 15;
      }

      // Grand Total
      doc.rect(380, y - 3, 185, 22).fill("#1D546D");
      doc.fillColor("white").font("Helvetica-Bold").fontSize(10);
      doc.text("GRAND TOTAL", 390, y + 2);
      doc.text("Rs. " + totalAmount.toFixed(2), 390, y + 2, {
        width: 165,
        align: "right",
      });

      // --- Footer ---
      y += 40;

      doc.fillColor("#666666").fontSize(9).font("Helvetica");
      doc.text("Thank you for your business!", 30, y, {
        align: "center",
        width: 535,
      });

      doc.fontSize(7).fillColor("#999999");
      doc.text("For queries, please contact support.", 30, y + 12, {
        align: "center",
        width: 535,
      });

      // Powered by StockFlow
      doc.fontSize(8).fillColor("#1D546D").font("Helvetica-Bold");
      doc.text("Powered by StockFlow", 30, y + 28, {
        align: "center",
        width: 535,
      });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

function generateTableRow(
  doc,
  y,
  itemCol,
  unitCostCol,
  quantityCol,
  lineTotalCol
) {
  doc
    .text(itemCol, 35, y, { width: 180 })
    .text(unitCostCol, 220, y, { width: 90, align: "right" })
    .text(quantityCol, 320, y, { width: 60, align: "center" })
    .text(lineTotalCol, 390, y, { width: 170, align: "right" });
}

module.exports = generateBillPDF;
