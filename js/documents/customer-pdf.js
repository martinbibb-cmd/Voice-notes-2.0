// Customer Document Generator
// Creates professional, customer-facing PDF with recommendations
// Uses high school reading level and bullet points for clarity

export default class DocumentGenerator {
  constructor() {
    this.loadJsPDF();
  }

  async loadJsPDF() {
    // In production, this would load jsPDF library
    // For now, we'll create a simplified version that generates HTML preview
    console.log('Document generator initialized');
  }

  generateCustomerPDF(jobData) {
    // Generate a professional customer-facing document
    const doc = this.createDocument(jobData);

    // For now, create an HTML preview and offer download
    this.downloadHTML(doc, jobData.name || 'recommendations');
  }

  createDocument(jobData) {
    const { customer, sections, photos, recommendations } = jobData;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Heating System Recommendations - ${customer || 'Customer'}</title>
  <style>
    @page {
      size: A4;
      margin: 20mm;
    }

    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 210mm;
      margin: 0 auto;
      padding: 20px;
    }

    h1 {
      color: #667eea;
      border-bottom: 3px solid #667eea;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }

    h2 {
      color: #764ba2;
      margin-top: 30px;
      margin-bottom: 15px;
    }

    h3 {
      color: #667eea;
      margin-top: 20px;
      margin-bottom: 10px;
    }

    .summary-box {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 10px;
      margin: 20px 0;
    }

    .summary-box h2 {
      color: white;
      margin-top: 0;
    }

    .recommendation {
      background: #f8fafc;
      border-left: 5px solid #10b981;
      padding: 20px;
      margin: 20px 0;
      border-radius: 5px;
      page-break-inside: avoid;
    }

    .recommendation.best {
      background: linear-gradient(to right, #f0fdf4, #f8fafc);
      border-left-color: #667eea;
      border-left-width: 8px;
    }

    .recommendation h3 {
      margin-top: 0;
    }

    .features-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin: 15px 0;
    }

    .features-col h4 {
      color: #10b981;
      margin-bottom: 10px;
    }

    .features-col.cons h4 {
      color: #f59e0b;
    }

    ul {
      padding-left: 25px;
    }

    li {
      margin-bottom: 8px;
    }

    .why-box {
      background: #e0e7ff;
      padding: 15px;
      border-radius: 5px;
      margin-top: 15px;
    }

    .photo {
      max-width: 100%;
      margin: 15px 0;
      border-radius: 5px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      page-break-inside: avoid;
    }

    .photo-caption {
      font-style: italic;
      color: #64748b;
      margin-top: 5px;
      font-size: 0.9em;
    }

    .next-steps {
      background: #fff7ed;
      border: 2px solid #f59e0b;
      padding: 20px;
      border-radius: 10px;
      margin: 30px 0;
    }

    .next-steps h2 {
      color: #f59e0b;
      margin-top: 0;
    }

    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e2e8f0;
      font-size: 0.9em;
      color: #64748b;
      text-align: center;
    }

    .badge {
      display: inline-block;
      background: #667eea;
      color: white;
      padding: 5px 15px;
      border-radius: 20px;
      font-size: 0.9em;
      font-weight: bold;
      margin-left: 10px;
    }

    @media print {
      body {
        padding: 0;
      }

      .no-print {
        display: none;
      }
    }
  </style>
</head>
<body>
  <h1>Your Personalized Heating System Recommendations</h1>

  <div class="summary-box">
    <h2>Executive Summary</h2>
    <p>
      Based on our survey of your property and your specific requirements, we've prepared
      tailored recommendations for your heating system upgrade. This document explains our
      recommendations in plain language, shows you exactly why each option suits your needs,
      and helps you make an informed decision.
    </p>
  </div>

  ${this.generateRecommendationsSection(recommendations)}

  ${this.generatePhotosSection(photos)}

  ${this.generateSectionsOverview(sections)}

  ${this.generateNextStepsSection()}

  <div class="footer">
    <p>Document prepared on ${new Date().toLocaleDateString()}</p>
    <p>All recommendations are based on your specific property requirements and current best practices.</p>
  </div>

  <div class="no-print" style="position: fixed; top: 20px; right: 20px;">
    <button onclick="window.print()" style="padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;">
      Print / Save as PDF
    </button>
  </div>
</body>
</html>
    `;

    return html;
  }

  generateRecommendationsSection(recommendations) {
    if (!recommendations || recommendations.length === 0) {
      return '<h2>Recommendations</h2><p>No recommendations generated yet.</p>';
    }

    let html = '<h2>Our Recommendations for You</h2>';

    recommendations.forEach((rec, index) => {
      const isBest = index === 0;

      html += `
        <div class="recommendation ${isBest ? 'best' : ''}">
          <h3>
            ${isBest ? '⭐ ' : ''}Option ${index + 1}: ${rec.title}
            ${isBest ? '<span class="badge">RECOMMENDED</span>' : ''}
          </h3>

          <p><strong>${rec.summary}</strong></p>

          <div class="features-grid">
            <div class="features-col">
              <h4>✓ Why This Works for You:</h4>
              <ul>
                ${rec.strengths.map(s => `<li>${s}</li>`).join('')}
              </ul>
            </div>
            <div class="features-col cons">
              <h4>⚠ Things to Consider:</h4>
              <ul>
                ${rec.limitations.map(l => `<li>${l}</li>`).join('')}
              </ul>
            </div>
          </div>

          <div class="why-box">
            <strong>Why we recommend this for your home:</strong>
            <p>${rec.rationale}</p>
          </div>

          <div style="margin-top: 15px; color: #64748b; font-size: 0.9em;">
            <strong>Key Details:</strong>
            Efficiency: ${rec.efficiency} |
            Typical Install Cost: ${rec.installCost} |
            Expected Lifespan: ${rec.lifespan}
          </div>
        </div>
      `;
    });

    return html;
  }

  generatePhotosSection(photos) {
    if (!photos || photos.length === 0) {
      return '';
    }

    let html = '<h2>Site Survey Photos</h2>';
    html += '<p>Here are photos from your property survey with our annotations:</p>';

    photos.forEach((photo, index) => {
      html += `
        <div style="page-break-inside: avoid; margin: 20px 0;">
          <img src="${photo.marked}" alt="Survey photo ${index + 1}" class="photo">
          <div class="photo-caption">
            Photo ${index + 1}: ${photo.annotation || 'Survey photo'}
          </div>
        </div>
      `;
    });

    return html;
  }

  generateSectionsOverview(sections) {
    if (!sections || Object.keys(sections).length === 0) {
      return '';
    }

    let html = '<h2>Survey Notes</h2>';
    html += '<p>Key points from our survey of your property:</p>';

    Object.values(sections).forEach(section => {
      if (section.content) {
        html += `
          <div style="margin: 20px 0;">
            <h3>${section.name}</h3>
            <p>${this.formatSectionContent(section.content)}</p>
          </div>
        `;
      }
    });

    return html;
  }

  formatSectionContent(content) {
    // Convert line breaks to bullet points for better readability
    const lines = content.split(/[.\n]+/).filter(line => line.trim().length > 0);

    if (lines.length <= 1) {
      return content;
    }

    return '<ul>' + lines.map(line => `<li>${line.trim()}</li>`).join('') + '</ul>';
  }

  generateNextStepsSection() {
    return `
      <div class="next-steps">
        <h2>Next Steps</h2>
        <ul>
          <li><strong>Review the recommendations</strong> - Take time to read through each option and discuss with your household</li>
          <li><strong>Ask questions</strong> - Contact us if you need any clarification or have concerns</li>
          <li><strong>Get a detailed quote</strong> - We'll provide exact pricing for your chosen system</li>
          <li><strong>Schedule installation</strong> - Once you're happy, we'll book you in at a convenient time</li>
          <li><strong>Enjoy your new system</strong> - Professional installation and ongoing support included</li>
        </ul>
      </div>
    `;
  }

  preview(jobData) {
    const doc = this.createDocument(jobData);

    // Open in new window
    const previewWindow = window.open('', '_blank');
    previewWindow.document.write(doc);
    previewWindow.document.close();
  }

  downloadHTML(html, filename) {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_recommendations.html`;
    a.click();
    URL.revokeObjectURL(url);

    alert('Customer document downloaded! Open it in a browser and use Print > Save as PDF to create a PDF.');
  }
}
