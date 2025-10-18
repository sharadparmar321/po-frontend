"use client";

import React, { useState, useCallback } from "react";
import PropTypes from "prop-types";
import { Plus, X } from "lucide-react";
import { jsPDF as JSPDF } from "jspdf"; // Import jsPDF with capitalized alias to satisfy eslint new-cap
import autoTable from "jspdf-autotable";
import SimpleHeader from "../components/SimpleHeader";
import "./Purchase.css";

function Button({
  children,
  onClick,
  disabled,
  className
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`px-4 py-2 rounded ${className}`}>
      {children}
    </button>
  );
}

Button.propTypes = {
  children: PropTypes.node.isRequired,
  onClick: PropTypes.func,
  disabled: PropTypes.bool,
  className: PropTypes.string
};

Button.defaultProps = {
  onClick: () => {},
  disabled: false,
  className: ""
};

function Input({
  className,
  value,
  onChange,
  type,
  placeholder,
  ariaLabel
}) {
  return (
    <input
      value={value}
      onChange={onChange}
      type={type}
      placeholder={placeholder}
      aria-label={ariaLabel || "input"}
      className={`border rounded px-2 py-1 ${className || ""}`}
    />
  );
}

Input.propTypes = {
  className: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func,
  type: PropTypes.string,
  placeholder: PropTypes.string,
  ariaLabel: PropTypes.string
};

Input.defaultProps = {
  className: "",
  value: "",
  onChange: () => {},
  type: "text",
  placeholder: "",
  ariaLabel: "input"
};

export default function Purchase() {
  const today = new Date().toISOString().split("T")[0];
  const [formData, setFormData] = useState({
    company: {
      name: "",
      address: "",
      cityStateZip: "",
      country: ""
    },
    vendor: {
      name: "",
      address: "",
      cityStateZip: "",
      country: ""
    },
    orderInfo: {
      poNumber: "",
      orderDate: today,
      deliveryDate: today
    },
    lineItems: [
      {
        id: "1",
        description: "",
        quantity: 1,
        rate: 0.0,
        gst: 0.0,
        amount: 0.0
      }
    ],
    subTotal: 0.0,
    taxRate: 0,
    taxAmount: 0.0,
    total: 0.0
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState("idle");

  const handleCompanyNameChange = (e) => {
    setFormData({
      ...formData,
      company: { ...formData.company, name: e.target.value }
    });
  };

  const updateNestedField = (section, field) => (e) => {
    setFormData({
      ...formData,
      [section]: { ...formData[section], [field]: e.target.value }
    });
  };

  const calculateTotals = (items) => {
    const subTotal = items.reduce((sum, item) => sum + item.amount, 0);
    const total = subTotal;
    return { subTotal, taxAmount: 0, total };
  };

  const updateLineItem = (id, field, value) => {
    const updatedItems = formData.lineItems.map((item) => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        updatedItem.amount = updatedItem.quantity * updatedItem.rate * (1 + updatedItem.gst / 100);
        return updatedItem;
      }
      return item;
    });

    const totals = calculateTotals(updatedItems);
    setFormData({
      ...formData,
      lineItems: updatedItems,
      ...totals
    });
  };

  const addLineItem = () => {
    const newItem = {
      id: Date.now().toString(),
      description: "",
      quantity: 1,
      rate: 0.0,
      gst: 0.0,
      amount: 0.0
    };
    setFormData({
      ...formData,
      lineItems: [...formData.lineItems, newItem]
    });
  };

  const exportToJSON = () => {
    const jsonData = JSON.stringify(formData, null, 2);
    const blob = new Blob([jsonData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `purchase-order-${formData.orderInfo.poNumber}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const updateGoogleSheet = async () => {
    try {
      const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
      const response = await fetch(`${API_BASE_URL}/purchaseorder/updateGoogleSheet`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to update Google Sheet: ${errorData.message || "Unknown error"}`);
      }
      console.log("Google Sheet updated successfully");
    } catch (error) {
      console.error("Error updating Google Sheet:", error);
      throw error; // Re-throw to handle in calling functions
    }
  };

  const exportToPDF = useCallback(async () => {
    try {
      await updateGoogleSheet(); // Ensure Google Sheet is updated

      // Send data to backend for PDF generation
      const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
      const response = await fetch(`${API_BASE_URL}/purchaseorder`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error("Failed to export to PDF");
      }

      // Generate PDF
      const doc = new JSPDF();

      const marginX = 20;
      const marginY = 20;

      const formatCurrency = (num) => `INR ${Number(num || 0).toFixed(2)}`;
      const safe = (val) => (val && String(val).trim().length > 0 ? String(val) : "-");

      // Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text("PURCHASE ORDER", 105, marginY, { align: "center" });
      doc.setDrawColor(75, 85, 99);
      doc.line(marginX, marginY + 6, 210 - marginX, marginY + 6);

      // Company block (left)
      let y = marginY + 20;
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      const companyLines = [
        safe(formData.company.name || ""),
        safe(formData.company.address || ""),
        safe(formData.company.cityStateZip || ""),
        safe(formData.company.country || "")
      ];
      companyLines.forEach((line, idx) => {
        doc.text(line, marginX, y + idx * 8);
      });

      // Order info box (right)
      const boxX = 125;
      const boxY = marginY + 12;
      const boxW = 65;
      const boxH = 32;
      doc.setDrawColor(209, 213, 219);
      doc.rect(boxX, boxY, boxW, boxH);

      doc.setFont("helvetica", "bold");
      doc.text("PO#", boxX + 4, boxY + 8);
      doc.text("Order Date", boxX + 4, boxY + 16);
      doc.text("Delivery Date", boxX + 4, boxY + 24);

      doc.setFont("helvetica", "normal");
      doc.text(safe(formData.orderInfo.poNumber), boxX + boxW - 4, boxY + 8, { align: "right" });
      doc.text(safe(formData.orderInfo.orderDate), boxX + boxW - 4, boxY + 16, { align: "right" });
      doc.text(safe(formData.orderInfo.deliveryDate), boxX + boxW - 4, boxY + 24, { align: "right" });

      // Vendor section title
      y = marginY + 60;
      doc.setFont("helvetica", "bold");
      doc.text("Vendor Address:", marginX, y);
      doc.setFont("helvetica", "normal");
      const vendorLines = [
        safe(formData.vendor.name || "Vendor name"),
        safe(formData.vendor.address || "Vendor address"),
        safe(formData.vendor.cityStateZip || "City, State Zip"),
        safe(formData.vendor.country || "Country")
      ];
      vendorLines.forEach((line, idx) => {
        doc.text(line, marginX, y + 10 + idx * 8);
      });

      // Table of items
      autoTable(doc, {
        startY: y + 48,
        head: [["Item Description", "Qty", "Rate", "GST (%)", "Amount"]],
        body: formData.lineItems.map((item) => [
          item.description || "Enter item description",
          item.quantity,
          Number(item.rate || 0).toFixed(2),
          Number(item.gst || 0).toFixed(2),
          Number(item.amount || 0).toFixed(2)
        ]),
        theme: "grid",
        styles: { fontSize: 10, cellPadding: 3, halign: "center" },
        headStyles: { fillColor: [75, 85, 99], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [245, 246, 248] },
        columnStyles: {
          0: { halign: "left", cellWidth: 100 },
          1: { halign: "center", cellWidth: 20 },
          2: { halign: "center", cellWidth: 30 },
          3: { halign: "center", cellWidth: 30 },
          4: { halign: "right", cellWidth: 30 }
        }
      });

      // Totals block as a small table aligned right
      const afterTableY = doc.lastAutoTable.finalY + 8;
      autoTable(doc, {
        startY: afterTableY,
        body: [
          ["Sub Total", formatCurrency(formData.subTotal)],
          [{ content: "TOTAL", styles: { fontStyle: "bold" } }, { content: formatCurrency(formData.total), styles: { fontStyle: "bold" } }]
        ],
        theme: "plain",
        styles: { fontSize: 11, halign: "right" },
        tableWidth: 80,
        margin: { left: 210 - 20 - 80 }
      });

      // Footer note
      const footerY = doc.lastAutoTable.finalY + 12;
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.text("Generated by Proquo", marginX, footerY);

      // Save
      doc.save(`purchase-order-${formData.orderInfo.poNumber || "PO"}.pdf`);
    } catch (error) {
      console.error("Error exporting to PDF:", error);
    }
  }, [formData]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitStatus("idle");

    try {
      await updateGoogleSheet(); // Ensure Google Sheet is updated

      const payload = {
        company: {
          name: formData.company.name,
          address: formData.company.address,
          cityStateZip: formData.company.cityStateZip,
          country: formData.company.country
        },
        vendor: {
          name: formData.vendor.name,
          address: formData.vendor.address,
          cityStateZip: formData.vendor.cityStateZip,
          country: formData.vendor.country
        },
        orderInfo: {
          poNumber: formData.orderInfo.poNumber,
          orderDate: new Date(formData.orderInfo.orderDate).toISOString().split("T")[0],
          deliveryDate: new Date(formData.orderInfo.deliveryDate).toISOString().split("T")[0]
        },
        lineItems: formData.lineItems.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          rate: item.rate,
          amount: item.amount
        })),
        subTotal: formData.subTotal,
        taxRate: formData.taxRate,
        taxAmount: formData.taxAmount,
        total: formData.total
      };

      const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
      const response = await fetch(`${API_BASE_URL}/purchaseorder`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("Failed to submit order");
      }

      const responseData = await response.json();
      setSubmitStatus("success");
      console.log("Purchase order submitted with unique reference ID:", responseData.unique_ref_id);
    } catch (error) {
      console.error("Error submitting order:", error);
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeLineItem = (id) => {
    const updatedItems = formData.lineItems.filter((item) => item.id !== id);
    const totals = calculateTotals(updatedItems);
    setFormData({
      ...formData,
      lineItems: updatedItems,
      ...totals
    });
  };

  return (
    <>
      <SimpleHeader />
      <div className="page-wrapper">
        <div className="container">
          {/* Header */}
          <div className="header">
            <div className="header-left">
              <Input
                value={formData.company.name}
                onChange={handleCompanyNameChange}
                ariaLabel="Company name"
                className="company-input"
              />
              <div className="company-details">
                <div>
                  <Input
                    placeholder="Contact person / Your Name"
                    value={formData.company.contact || ""}
                    ariaLabel="Company contact"
                    onChange={updateNestedField("company", "contact")}
                    className="input-description"
                  />
                </div>
                <div>
                  <Input
                    placeholder="Company Address"
                    value={formData.company.address}
                    ariaLabel="Company address"
                    onChange={updateNestedField("company", "address")}
                    className="input-description"
                  />
                </div>
                <div>
                  <Input
                    placeholder="City, State Zip"
                    value={formData.company.cityStateZip}
                    ariaLabel="Company city state zip"
                    onChange={updateNestedField("company", "cityStateZip")}
                    className="input-description"
                  />
                </div>
                <div>
                  <Input
                    placeholder="Country"
                    value={formData.company.country}
                    ariaLabel="Company country"
                    onChange={updateNestedField("company", "country")}
                    className="input-description"
                  />
                </div>
              </div>
            </div>
            <div className="header-right">
              <h1>PURCHASE ORDER</h1>
            </div>
          </div>

          {/* Vendor + Order Info */}
          <div className="vendor-order-info">
            <div className="vendor-address">
              <h2>Vendor Address:</h2>
              <div>
                <div>
                  <Input
                    placeholder="Vendor name"
                    value={formData.vendor.name}
                    ariaLabel="Vendor name"
                    onChange={updateNestedField("vendor", "name")}
                    className="input-description"
                  />
                </div>
                <div>
                  <Input
                    placeholder="Vendor address"
                    value={formData.vendor.address}
                    ariaLabel="Vendor address"
                    onChange={updateNestedField("vendor", "address")}
                    className="input-description"
                  />
                </div>
                <div>
                  <Input
                    placeholder="City, State Zip"
                    value={formData.vendor.cityStateZip}
                    ariaLabel="Vendor city state zip"
                    onChange={updateNestedField("vendor", "cityStateZip")}
                    className="input-description"
                  />
                </div>
                <div>
                  <Input
                    placeholder="Country"
                    value={formData.vendor.country}
                    ariaLabel="Vendor country"
                    onChange={updateNestedField("vendor", "country")}
                    className="input-description"
                  />
                </div>
              </div>
            </div>
            <div className="order-info">
              <div>
                <span className="label">PO#</span>
                <Input
                  placeholder="PO number"
                  value={formData.orderInfo.poNumber}
                  ariaLabel="PO number"
                  onChange={updateNestedField("orderInfo", "poNumber")}
                  className="input-description"
                />
              </div>
              <div>
                <span className="label">Order Date</span>
                <Input
                  type="date"
                  value={formData.orderInfo.orderDate}
                  ariaLabel="Order date"
                  onChange={updateNestedField("orderInfo", "orderDate")}
                  className="input-description"
                />
              </div>
              <div>
                <span className="label">Delivery Date</span>
                <Input
                  type="date"
                  value={formData.orderInfo.deliveryDate}
                  ariaLabel="Delivery date"
                  onChange={updateNestedField("orderInfo", "deliveryDate")}
                  className="input-description"
                />
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="line-items">
            <table>
              <thead>
                <tr>
                  <th className="left">Item Description</th>
                  <th className="center qty">Qty</th>
                  <th className="center rate">Rate</th>
                  <th className="center gst">GST (%)</th>
                  <th className="right amount">Amount</th>
                  <th className="center actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {formData.lineItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Input
                        placeholder="Enter item description"
                        value={item.description}
                        ariaLabel="Item description"
                        onChange={(e) => updateLineItem(item.id, "description", e.target.value)}
                        className="input-description"
                      />
                    </td>
                    <td className="center">
                      <Input
                        type="number"
                        min="0"
                        value={item.quantity}
                        ariaLabel="Quantity"
                        onChange={(e) => updateLineItem(item.id, "quantity", Number.parseFloat(e.target.value) || 0)}
                        className="input-qty"
                      />
                    </td>
                    <td className="center">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.rate.toFixed(2)}
                        ariaLabel="Rate"
                        onChange={(e) => updateLineItem(item.id, "rate", Number.parseFloat(e.target.value) || 0)}
                        className="input-rate"
                      />
                    </td>
                    <td className="center">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.gst.toFixed(2)}
                        ariaLabel="GST"
                        onChange={(e) => updateLineItem(item.id, "gst", Number.parseFloat(e.target.value) || 0)}
                        className="input-gst"
                      />
                    </td>
                    <td className="right">{item.amount.toFixed(2)}</td>
                    <td className="center">
                      <button
                        type="button"
                        onClick={() => removeLineItem(item.id)}
                        className="remove-btn"
                        aria-label="Remove line item"
                      >
                        <X className="icon" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Add Line Item */}
            <button type="button" onClick={addLineItem} className="add-line-item">
              <div className="add-icon">
                <Plus className="plus-icon" />
              </div>
              Add Line Item
            </button>

            {/* Totals */}
            <div className="totals">
              <div className="subtotal">
                <span>Sub Total</span>
                <span>{formData.subTotal.toFixed(2)}</span>
              </div>
              <div className="total">
                <span>TOTAL</span>
                <span>{`₹ ${formData.total.toFixed(2)}`}</span>
              </div>
            </div>

            {/* Buttons */}
            <div className="buttons">
              {/* <Button onClick={exportToJSON} className="export-btn">
                Export to JSON
              </Button> */}
              <Button onClick={exportToPDF} className="export-btn">
                Export to PDF
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting} className="submit-btn">
                {isSubmitting ? "Submitting..." : "Submit Order"}
              </Button>
            </div>

            {/* Status */}
            {submitStatus === "success" && (
              <div className="status success">
                Purchase order submitted successfully!
                <br />
              </div>
            )}
            {submitStatus === "error" && (
              <div className="status error">Failed to submit purchase order. Please try again.</div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
