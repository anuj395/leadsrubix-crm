const quoteModel = require('../models/quoteModel');

exports.list = async (req, res, next) => {
  try {
    const orgId = req.user.organization_id || req.user.organizationId;
    const filter = { organization_id: orgId };
    const items = await quoteModel.list({ filter });
    res.json({ items });
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const orgId = req.user.organization_id || req.user.organizationId;
    const count = await quoteModel.Quote.countDocuments({ organization_id: orgId });
    const quoteNumber = `QT-${Date.now().toString().slice(-6)}-${count + 1}`;
    
    const payload = {
      ...req.body,
      quote_number: quoteNumber,
      organization_id: orgId,
      created_by: req.user._id || req.user.id
    };
    const item = await quoteModel.create(payload);
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const id = req.params.id;
    const updated = await quoteModel.findByIdAndUpdate(id, { $set: req.body }, { new: true });
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const id = req.params.id;
    await quoteModel.remove(id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

exports.retrieve = async (req, res, next) => {
  try {
    const id = req.params.id;
    const item = await quoteModel.findById(id);
    if (!item) return res.status(404).json({ message: 'Quote not found' });
    res.json(item);
  } catch (err) {
    next(err);
  }
};

exports.convertToOrder = async (req, res, next) => {
  try {
    const id = req.params.id;
    const quote = await quoteModel.findById(id);
    if (!quote) return res.status(404).json({ message: 'Quote not found' });

    const updated = await quoteModel.findByIdAndUpdate(id, { $set: { status: 'ORDERED' } }, { new: true });
    res.json({ message: 'Quote converted to Order successfully', quote: updated });
  } catch (err) {
    next(err);
  }
};

exports.generatePdf = async (req, res, next) => {
  try {
    const id = req.params.id;
    const quote = await quoteModel.findById(id);
    if (!quote) return res.status(404).json({ message: 'Quote not found' });

    // Render as simple, beautiful, printable HTML
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Quote ${quote.quote_number}</title>
        <style>
          body { font-family: sans-serif; margin: 40px; color: #333; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; }
          .logo { font-size: 24px; font-weight: bold; color: #3b82f6; }
          .details { margin: 30px 0; display: flex; justify-content: space-between; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background-color: #f3f4f6; }
          .totals { margin-top: 30px; text-align: right; }
          .totals div { margin-bottom: 8px; font-size: 16px; }
          .grand-total { font-size: 20px; font-weight: bold; color: #3b82f6; }
          .footer { margin-top: 50px; border-top: 1px solid #ddd; padding-top: 20px; font-size: 12px; text-align: center; color: #666; }
          @media print {
            body { margin: 20px; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div style="text-align: right; margin-bottom: 20px;">
          <button onclick="window.print()" style="padding: 10px 20px; background-color: #3b82f6; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">Print / Save as PDF</button>
        </div>
        <div class="header">
          <div>
            <div class="logo">LeadsRubix CRM</div>
            <div>Multi-Tenant Enterprise Solutions</div>
          </div>
          <div style="text-align: right;">
            <h2>INVOICE / QUOTE</h2>
            <div><strong>Quote #:</strong> ${quote.quote_number}</div>
            <div><strong>Date:</strong> ${new Date(quote.createdAt).toLocaleDateString()}</div>
            <div><strong>Valid Till:</strong> ${quote.valid_till ? new Date(quote.valid_till).toLocaleDateString() : '—'}</div>
          </div>
        </div>
        <div class="details">
          <div>
            <h3>From:</h3>
            <strong>LeadsRubix CRM Tenant</strong><br>
            Organization ID: ${quote.organization_id}<br>
          </div>
          <div style="text-align: right;">
            <h3>Status:</h3>
            <span style="padding: 6px 12px; background-color: #3b82f6; color: white; border-radius: 4px; font-weight: bold; font-size: 14px;">${quote.status}</span>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Product / Service</th>
              <th style="text-align: right;">Qty</th>
              <th style="text-align: right;">Unit Price</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${(quote.items || []).map(item => `
              <tr>
                <td>${item.product_name || item.productName}</td>
                <td style="text-align: right;">${item.quantity}</td>
                <td style="text-align: right;">$${(item.unit_price || item.unitPrice || 0).toLocaleString()}</td>
                <td style="text-align: right;">$${(item.total || 0).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="totals">
          <div>Subtotal: $${(quote.subtotal || 0).toLocaleString()}</div>
          <div>Tax: $${(quote.tax || 0).toLocaleString()}</div>
          <div>Discount: -$${(quote.discount || 0).toLocaleString()}</div>
          <div class="grand-total">Grand Total: $${(quote.grand_total || quote.grandTotal || 0).toLocaleString()}</div>
        </div>
        <div class="footer">
          <p>Thank you for your business!</p>
          <p>This is a computer-generated quote document.</p>
        </div>
      </body>
      </html>
    `;
    res.send(html);
  } catch (err) {
    next(err);
  }
};
