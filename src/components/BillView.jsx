export const getBillHTML = (bill) => {
  const date = new Date(bill.date).toLocaleDateString('en-CA');

  // Calculate total discount = sum of (originalPrice - editedPrice) * qty
  // Only items where originalPrice is present (i.e. price was edited) contribute
  const totalDiscount = bill.items.reduce((sum, i) => {
    if (i.originalPrice !== undefined && i.originalPrice !== null) {
      return sum + (i.originalPrice - i.price) * i.quantity;
    }
    return sum;
  }, 0);

  const hasAnyDiscount = totalDiscount > 0;

  // Check if ANY item has an edited price — used to decide whether to show Dis.Pri column
  const hasEditedPrice = bill.items.some(
    i => i.originalPrice !== undefined && i.originalPrice !== null
  );

  return `
  <html>
    <head>
      <meta charset="UTF-8">
      <title>Bill ${bill.billId}</title>
      <style>
        @media print {
          @page { size: 80mm auto; margin: 0; }
        }

        body {
          font-family: 'Courier New', monospace;
          width: 300px;
          margin: 0 auto;
          padding: 5px;
          font-size: 10px;
        }
        .header { text-align: center; }
        .shop-name { font-size: 18px; font-weight: bold; margin: 4px 0; }
        .bio { font-size: 11px; margin: 2px 0; }
        .separator { border-top: 1px dashed #000; margin: 8px 0; }
        table { width: 100%; border-collapse: collapse; }
        th, td { font-size: 10px; padding: 3px 0; }
        th { border-bottom: 1px solid #000; }
        .right { text-align: right; }
        .center { text-align: center; }
        .variant-info {
          font-size: 9px;
          color: #555;
          font-style: italic;
        }
        .unit-label {
          font-size: 9px;
          color: #666;
        }
        .dis-price {
          font-size: 10px;
          color: #000;
        }
        .original-price {
          font-size: 9px;
          color: #888;
          text-decoration: line-through;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 2px 0;
        }
        .summary-row b { font-size: 11px; }
        .sinhala-note {
          font-size: 9px;
          text-align: center;
          margin: 8px 0;
          line-height: 1.4;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="shop-name">දිසානායක සිටි සෙන්ටර්</div>
        <div class="bio">නගරය - ගමට</div>
        <p style="margin:2px 0">නො.68,යුදගනාව ජනපදය,බුත්තල</p>
        <p style="margin:2px 0">Tel: 0704283858</p>
      </div>

      <div class="separator"></div>

      <p style="margin:4px 0"><b>Bill ID – ${bill.billId}</b></p>
      <p style="margin:4px 0">${date.replace(/-/g, '.')} | ${bill.time}</p>

      <div class="separator"></div>

      <table>
        <thead>
          <tr>
            <th style="width:38%">නම</th>
            <th style="width:10%" class="center">ප්‍රමාණය</th>
            <th style="width:16%" class="right">මිල</th>
            ${hasEditedPrice ? `<th style="width:16%" class="right">අපේ මිල</th>` : ''}
            <th style="width:20%" class="right">එකතුව</th>
          </tr>
        </thead>
        <tbody>
          ${bill.items.map(i => {
            const variantText = (i.variant && i.variant !== 'Standard')
              ? `<br><span class="variant-info">(${i.variant})</span>`
              : '';

            const unitText = (i.unit && i.unit !== 'unit')
              ? `<span class="unit-label">${i.unit}</span>`
              : '';

            const isPriceEdited = i.originalPrice !== undefined && i.originalPrice !== null;

            // Price column: if edited, show original with strikethrough; else show normal
            const priceCell = isPriceEdited
              ? `<span class="original-price">${parseFloat(i.originalPrice).toFixed(2)}</span>`
              : `${parseFloat(i.price).toFixed(2)}`;

            // Dis.Pri column: only show value for rows that were edited
            const disPriCell = hasEditedPrice
              ? (isPriceEdited
                  ? `<span class="dis-price">${parseFloat(i.price).toFixed(2)}</span>`
                  : ``)
              : '';

            return `
            <tr>
              <td>${i.name}${variantText}</td>
              <td class="center">${i.quantity}${unitText}</td>
              <td class="right">${priceCell}</td>
              ${hasEditedPrice ? `<td class="right">${disPriCell}</td>` : ''}
              <td class="right">${parseFloat(i.total).toFixed(2)}</td>
            </tr>
            `;
          }).join('')}
        </tbody>
      </table>

      <div class="separator"></div>

      <div class="summary-row"><b>මුලු.එකතු:</b><b>${bill.totalAmount.toFixed(2)}/=</b></div>
      <div class="summary-row"><b>ගෙවීම්:</b><b>${bill.cash.toFixed(2)}/=</b></div>
      <div class="summary-row"><b>ඉතිරි:</b><b>${bill.change.toFixed(2)}/=</b></div>
      ${hasAnyDiscount
        ? `<div class="summary-row"><b>ලාබය:</b><b>${totalDiscount.toFixed(2)}/=</b></div>`
        : ''}

      <div class="separator"></div>

      <div class="sinhala-note">
        <p>භාණ්ඩ මාරු කිරීමට</p>
        <p>බිල රෑගෙන ඒම අනිවාර්ය වේ.</p>
      </div>

      <p style="text-align:center"><b>Thank You..!</b></p>

      <script>
        window.onload = () => {
          window.print();
          window.onafterprint = () => window.close();
        };
      </script>
    </body>
  </html>
  `;
};
