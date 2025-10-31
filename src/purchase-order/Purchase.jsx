"use client";

/* eslint-disable react/react-in-jsx-scope, jsx-a11y/label-has-associated-control */
/* eslint-disable react/jsx-one-expression-per-line, object-curly-newline, comma-dangle, semi */

import React, { useState, useCallback } from "react"
import PropTypes from "prop-types"
import { Plus, X, Calendar } from "lucide-react"
import { jsPDF as JSPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import * as XLSX from "xlsx";
import SimpleHeader from "../components/SimpleHeader"
import "./Purchase.css"

function Button({ children, onClick, disabled, className }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`px-4 py-2 rounded ${className}`}>
      {children}
    </button>
  )
}

Button.propTypes = {
  children: PropTypes.node.isRequired,
  onClick: PropTypes.func,
  disabled: PropTypes.bool,
  className: PropTypes.string,
}

Button.defaultProps = {
  onClick: () => {},
  disabled: false,
  className: "",
}

function Input({ className, value, onChange, type, placeholder, ariaLabel }) {
  return (
    <input
      value={value}
      onChange={onChange}
      type={type}
      placeholder={placeholder}
      aria-label={ariaLabel || "input"}
      className={`border rounded px-2 py-1 ${className || ""}`}
    />
  )
}

function Modal({ title, description, primaryText, secondaryText, onPrimary, onClose }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="po-modal-overlay"
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}
    >
      <div
        className="po-modal-card"
        style={{ width: 420, maxWidth: "92%", background: "#fff", borderRadius: 8, boxShadow: "0 10px 30px rgba(0,0,0,0.18)", overflow: "hidden" }}
      >
        <div style={{ padding: "14px 16px", background: "#f1f5f9", borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{title}</div>
        </div>
        <div style={{ padding: 16, fontSize: 14, lineHeight: 1.5 }}>
          {description}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", padding: 12, borderTop: "1px solid #e2e8f0" }}>
          {secondaryText && (
            <button type="button" onClick={onClose} className="px-3 py-1.5" style={{ border: "1px solid #cbd5e1", borderRadius: 6, background: "#fff" }}>
              {secondaryText}
            </button>
          )}
          {primaryText && (
            <button type="button" onClick={onPrimary} className="px-3 py-1.5" style={{ borderRadius: 6, background: "#2563eb", color: "#fff", border: 0 }}>
              {primaryText}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

Modal.propTypes = {
  title: PropTypes.node.isRequired,
  description: PropTypes.node,
  primaryText: PropTypes.node,
  secondaryText: PropTypes.node,
  onPrimary: PropTypes.func,
  onClose: PropTypes.func,
}

Modal.defaultProps = {
  description: null,
  primaryText: null,
  secondaryText: null,
  onPrimary: () => {},
  onClose: () => {},
}

Input.propTypes = {
  className: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func,
  type: PropTypes.string,
  placeholder: PropTypes.string,
  ariaLabel: PropTypes.string,
}

Input.defaultProps = {
  className: "",
  value: "",
  onChange: () => {},
  type: "text",
  placeholder: "",
  ariaLabel: "input",
}

function ErrorMessage({ message }) {
  if (!message) return null
  return <div className="error-message">{message}</div>
}

ErrorMessage.propTypes = {
  message: PropTypes.string,
}

ErrorMessage.defaultProps = {
  message: "",
}

// Helper for Excel export (outside component)
function exportToExcel(poData, uniqueId) {
  const wb = XLSX.utils.book_new();
  const orderRows = poData.lineItems.map((item, idx) => ({
    "PO Unique ID": uniqueId || poData.orderInfo.poNumber || "",
    "Buyer Name": poData.company.name,
    "Buyer Address": poData.company.address,
    "Buyer City/State/Zip": poData.company.cityStateZip,
    "Buyer Country": poData.company.country,
    "Buyer Contact": poData.company.contact,
    "Vendor Name": poData.vendor.name,
    "Vendor Address": poData.vendor.address,
    "Vendor City/State/Zip": poData.vendor.cityStateZip,
    "Vendor Country": poData.vendor.country,
    "PO Number": poData.orderInfo.poNumber,
    "Order Date": poData.orderInfo.orderDate,
    "Delivery Date": poData.orderInfo.deliveryDate,
    "Item Description": item.description,
    Quantity: item.quantity,
    Rate: item.rate,
    "GST (%)": item.gst,
    "Item Amount": item.amount,
    Subtotal: poData.subTotal,
    Total: poData.total
  }));
  const ws = XLSX.utils.json_to_sheet(orderRows);
  XLSX.utils.book_append_sheet(wb, ws, "PurchaseOrder");
  XLSX.writeFile(wb, `purchase-order-${poData.orderInfo.poNumber || uniqueId || "PO"}.xlsx`);
}

// Helper to build payload for API
function buildPurchaseOrderPayload(formData) {
  return {
    company: {
      name: formData.company.name,
      address: formData.company.address,
      cityStateZip: formData.company.cityStateZip,
      country: formData.company.country,
      contact: formData.company.contact,
    },
    vendor: {
      name: formData.vendor.name,
      address: formData.vendor.address,
      cityStateZip: formData.vendor.cityStateZip,
      country: formData.vendor.country,
    },
    orderInfo: {
      poNumber: formData.orderInfo.poNumber,
      orderDate: new Date(formData.orderInfo.orderDate).toISOString().split("T")[0],
      deliveryDate: new Date(formData.orderInfo.deliveryDate).toISOString().split("T")[0],
    },
    lineItems: formData.lineItems.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      rate: item.rate,
      gst: item.gst,
      amount: item.amount,
    })),
    subTotal: formData.subTotal,
    taxRate: formData.taxRate,
    taxAmount: formData.taxAmount,
    total: formData.total,
  }
}

export default function Purchase() {
  const today = new Date().toISOString().split("T")[0]
  const [formData, setFormData] = useState({
    company: {
      name: "",
      address: "",
      cityStateZip: "",
      country: "",
      contact: "",
    },
    vendor: {
      name: "",
      address: "",
      cityStateZip: "",
      country: "",
    },
    orderInfo: {
      poNumber: "",
      orderDate: today,
      deliveryDate: today,
    },
    lineItems: [
      {
        id: "1",
        description: "",
        quantity: 1,
        rate: 0.0,
        gst: 0.0,
        amount: 0.0,
      },
    ],
    subTotal: 0.0,
    taxRate: 0,
    taxAmount: 0.0,
    total: 0.0,
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState("idle")
  const [validationErrors, setValidationErrors] = useState({})
  const [modal, setModal] = useState(null)

  const handleCompanyNameChange = (e) => {
    setFormData({
      ...formData,
      company: { ...formData.company, name: e.target.value },
    })
  }

  const updateNestedField = (section, field) => (e) => {
    setFormData({
      ...formData,
      [section]: { ...formData[section], [field]: e.target.value },
    })
  }

  // Sanitize numeric-only fields (PO number and pincodes)
  const updateNumericField = (section, field) => (e) => {
    const digitsOnly = String(e.target.value || "").replace(/\D/g, "")
    setFormData({
      ...formData,
      [section]: { ...formData[section], [field]: digitsOnly },
    })
  }

  const calculateTotals = (items) => {
    const subTotal = items.reduce((sum, item) => sum + item.amount, 0)
    const total = subTotal
    return { subTotal, taxAmount: 0, total }
  }

  const updateLineItem = (id, field, value) => {
    const updatedItems = formData.lineItems.map((item) => {
      if (item.id === id) {
        // Clamp negatives for numeric fields to 0
        let normalizedValue = value
        if (field === "quantity" || field === "rate" || field === "gst") {
          normalizedValue = Number.isFinite(value) ? Math.max(0, value) : 0
        }

        const updatedItem = { ...item, [field]: normalizedValue }
        // Always compute amount from quantity, rate and gst
        const qty = Number(updatedItem.quantity) || 0
        const rate = Number(updatedItem.rate) || 0
        const gst = Number(updatedItem.gst) || 0
        updatedItem.amount = qty * rate * (1 + gst / 100)
        return updatedItem
      }
      return item
    })

    const totals = calculateTotals(updatedItems)
    setFormData({
      ...formData,
      lineItems: updatedItems,
      ...totals,
    })
  }

  const addLineItem = () => {
    const newItem = {
      id: Date.now().toString(),
      description: "",
      quantity: 1,
      rate: 0.0,
      gst: 0.0,
      amount: 0.0,
    }
    setFormData({
      ...formData,
      lineItems: [...formData.lineItems, newItem],
    })
  }

  const exportToJSON = () => {
    const jsonData = JSON.stringify(formData, null, 2)
    const blob = new Blob([jsonData], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `purchase-order-${formData.orderInfo.poNumber}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const checkDuplicate = async () => {
    const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000"
    const payload = buildPurchaseOrderPayload(formData)
    const resp = await fetch(`${API_BASE_URL}/purchaseorder/checkDuplicate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!resp.ok) {
      throw new Error(`Duplicate check failed (${resp.status})`)
    }
    return resp.json()
  }

  const updateGoogleSheet = async (uniqueId) => {
    try {
      const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000"
      const response = await fetch(`${API_BASE_URL}/purchaseorder/updateGoogleSheet`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          uniqueId: uniqueId || undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Failed to update Google Sheet: ${errorData.message || "Unknown error"}`)
      }
      console.log("Google Sheet updated successfully")
    } catch (error) {
      console.error("Error updating Google Sheet:", error)
      throw error
    }
  }

  const exportToPDF = useCallback(async () => {
    try {
      const isValid = validateForm()
      if (!isValid) {
        console.warn("[PO][UI] Validation failed; blocking exportToPDF");
        return
      }

      const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000"
      const payload = buildPurchaseOrderPayload(formData)
      console.log("[PO][UI] exportToPDF payload", payload)

      // Duplicate validation: reuse existing or create new before PDF
      let newUnique = ""
      let createdNew = false
      try {
        const dup = await checkDuplicate()
        if (dup?.exists) {
          newUnique = dup.unique_id || ""
          console.log("[PO][UI] Duplicate found; using existing record for PDF", newUnique)
        } else {
          const response = await fetch(`${API_BASE_URL}/purchaseorder`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
          if (response.ok) {
            const responseData = await response.json()
            console.log("[PO][UI] exportToPDF API success", responseData)
            newUnique = responseData.unique_id || responseData.data?.unique_id || newUnique
            createdNew = true
          } else {
            const errText = await response.text()
            console.warn("[PO][UI] DB save failed during exportToPDF; aborting PDF.", response.status, errText)
            return
          }
        }
      } catch (dbErr) {
        console.warn("[PO][UI] Duplicate check/save error during exportToPDF; aborting PDF.", dbErr)
        return
      }

      // Update Google Sheet ONLY if we created a new record
      if (createdNew) {
        try {
          await updateGoogleSheet(newUnique)
        } catch (sheetError) {
          console.warn("[PO][UI] Google Sheet update failed during PDF export:", sheetError)
        }
      }

      // Generate and download PDF
      const doc = new JSPDF()
      const marginX = 15
      const marginY = 15
      const pageWidth = 210
      const pageHeight = 297
      const numberFormatter = new Intl.NumberFormat("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
      const formatNumber = (num) => numberFormatter.format(Number(num || 0))
      const formatCurrency = (num) => `INR ${formatNumber(num)}`
      const safe = (val) => (val && String(val).trim().length > 0 ? String(val) : "-")

      // Brand colors
      const primary = [59, 130, 246] // blue-500
      const slate = [71, 85, 105] // slate-600
      const lightGray = [243, 244, 246]

      // Helper: load an image from public folder
      const loadImage = (src) => new Promise((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = "anonymous"
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = src
      })

      // Header ribbon
      doc.setFillColor(primary[0], primary[1], primary[2])
      doc.rect(0, 0, pageWidth, 18, "F")

      // Try to draw brand logo if available; fallback to badge
      let drewLogo = false
      try {
        const base = process.env.PUBLIC_URL || ""
        const srcCandidates = [
          `${base}/proquo-logo.png`,
          `${base}/proquo-logo.jpg`,
          `${base}/logo.png`,
        ]
        /* eslint-disable no-restricted-syntax */
        for (const src of srcCandidates) {
          try {
            // eslint-disable-next-line no-await-in-loop
            const img = await loadImage(src)
            // Place logo on left in ribbon
            const logoH = 10
            const logoW = 34
            doc.addImage(img, "PNG", marginX, 4, logoW, logoH)
            drewLogo = true
            break
          } catch (e) {
            // try next
          }
        }
        /* eslint-enable no-restricted-syntax */
      } catch (e) {
        // ignore
      }
      if (!drewLogo) {
        // Logo badge fallback
        doc.setFillColor(255, 255, 255)
        doc.circle(marginX + 6, 9, 5, "F")
        doc.setTextColor(primary[0], primary[1], primary[2])
        doc.setFont("helvetica", "bold")
        doc.setFontSize(10)
        doc.text("P", marginX + 3.6, 12, undefined)
      }

      // Title
      doc.setTextColor(255, 255, 255)
      doc.setFont("helvetica", "bold")
      doc.setFontSize(16)
      doc.text("PURCHASE ORDER", pageWidth / 2, 12, { align: "center" })

      // Reset drawing styles
      doc.setTextColor(0, 0, 0)
      doc.setDrawColor(230, 232, 235)
      doc.setLineWidth(0.3)

      let y = marginY + 14

      // Subtle watermark
      doc.setFontSize(46)
      doc.setTextColor(240, 245, 255)
      doc.text("Proquo.tech", pageWidth / 2, pageHeight / 2, { align: "center", angle: -25 })
      doc.setTextColor(0, 0, 0)

      // Buyer/Company Details Section
      doc.setFont("helvetica", "bold")
      doc.setFontSize(10)
      doc.text("Buyer Details:", marginX, y)
      y += 6

      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
      const lineHeight = 5

      if (formData.company.name) {
        doc.text(`Buyer/Company Name: ${safe(formData.company.name)}`, marginX, y)
        y += lineHeight
      }
      if (formData.company.address) {
        doc.text(`Company Address: ${safe(formData.company.address)}`, marginX, y)
        y += lineHeight
      }
      if (formData.company.cityStateZip) {
        doc.text(`Pincode: ${safe(formData.company.cityStateZip)}`, marginX, y)
        y += lineHeight
      }
      if (formData.company.country) {
        doc.text(`Country: ${safe(formData.company.country)}`, marginX, y)
        y += lineHeight
      }
      if (formData.company.contact) {
        doc.text(`Contact Person: ${safe(formData.company.contact)}`, marginX, y)
        y += lineHeight
      }

      // Order Information Card (Right side)
      const boxX = 130
      const boxY = marginY + 16
      const boxW = 65
      const boxH = 30
      doc.setFillColor(255, 255, 255)
      doc.setDrawColor(226, 232, 240)
      doc.rect(boxX, boxY, boxW, boxH, "FD")

      let boxYPos = boxY + 6
      doc.setFont("helvetica", "bold")
      doc.setFontSize(8)
      doc.text("PO#", boxX + 3, boxYPos)
      doc.setFont("helvetica", "normal")
      doc.text(safe(formData.orderInfo.poNumber), boxX + boxW - 3, boxYPos, { align: "right" })

      boxYPos += 7
      doc.setFont("helvetica", "bold")
      doc.text("Order Date", boxX + 3, boxYPos)
      doc.setFont("helvetica", "normal")
      doc.text(safe(formData.orderInfo.orderDate), boxX + boxW - 3, boxYPos, { align: "right" })

      boxYPos += 7
      doc.setFont("helvetica", "bold")
      doc.text("Delivery Date", boxX + 3, boxYPos)
      doc.setFont("helvetica", "normal")
      doc.text(safe(formData.orderInfo.deliveryDate), boxX + boxW - 3, boxYPos, { align: "right" })

      // Vendor Details Section
      y = Math.max(y, marginY + 48)
      doc.setFont("helvetica", "bold")
      doc.setFontSize(10)
      doc.text("Vendor Details:", marginX, y)
      y += 6

      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
      if (formData.vendor.name) {
        doc.text(`Vendor Name: ${safe(formData.vendor.name)}`, marginX, y)
        y += lineHeight
      }
      if (formData.vendor.address) {
        doc.text(`Vendor Address: ${safe(formData.vendor.address)}`, marginX, y)
        y += lineHeight
      }
      if (formData.vendor.cityStateZip) {
        doc.text(`Pincode: ${safe(formData.vendor.cityStateZip)}`, marginX, y)
        y += lineHeight
      }
      if (formData.vendor.country) {
        doc.text(`Country: ${safe(formData.vendor.country)}`, marginX, y)
        y += lineHeight
      }

      // Line Items Table
      const tableStartY = y + 8
      autoTable(doc, {
        startY: tableStartY,
        head: [["Item Description", "Qty", "Rate", "GST (%)", "Amount"]],
        body: formData.lineItems.map((item) => [
          safe(item.description || ""),
          Number(item.quantity || 0),
          formatNumber(item.rate || 0),
          formatNumber(item.gst || 0),
          formatNumber(item.amount || 0),
        ]),
        theme: "grid",
        styles: {
          fontSize: 8,
          cellPadding: 2.5,
          halign: "center",
          overflow: "linebreak",
        },
        headStyles: {
          fillColor: primary,
          textColor: [255, 255, 255],
          fontSize: 9,
          fontStyle: "bold",
        },
        alternateRowStyles: { fillColor: lightGray },
        columnStyles: {
          0: { halign: "left", cellWidth: 90 },
          1: { halign: "center", cellWidth: 18 },
          2: { halign: "center", cellWidth: 25 },
          3: { halign: "center", cellWidth: 25 },
          4: { halign: "right", cellWidth: 30 },
        },
        margin: { left: marginX, right: marginX },
      })

      // Totals Section (only TOTAL)
      const afterTableY = doc.lastAutoTable.finalY + 6
      autoTable(doc, {
        startY: afterTableY,
        body: [
          [
            { content: "TOTAL", styles: { fontStyle: "bold", fontSize: 9, textColor: primary } },
            { content: formatCurrency(formData.total), styles: { fontStyle: "bold", fontSize: 9, textColor: primary } },
          ],
        ],
        theme: "plain",
        styles: { fontSize: 9, halign: "right", cellPadding: 2 },
        tableWidth: 75,
        margin: { left: pageWidth - marginX - 75 },
      })

      // Footer
      const footerY = Math.min(doc.lastAutoTable.finalY + 10, pageHeight - 15)
      doc.setFontSize(7)
      doc.setTextColor(slate[0], slate[1], slate[2])
      doc.setFont("helvetica", "normal")
      doc.text("Generated by Proquo", marginX, footerY)

      doc.save(`purchase-order-${formData.orderInfo.poNumber || "PO"}.pdf`)
      console.log("[PO][UI] PDF downloaded")
    } catch (error) {
      console.error("[PO][UI] Error exporting to PDF:", error)
    }
  }, [formData])

  const validateForm = () => {
    const errors = {}

    if (!formData.company.name.trim()) {
      errors.companyName = "Field cannot be empty"
    }
    if (!formData.company.contact || !formData.company.contact.trim()) {
      errors.companyContact = "Field cannot be empty"
    }
    if (!formData.company.address.trim()) {
      errors.companyAddress = "Field cannot be empty"
    }
    if (!formData.company.cityStateZip.trim()) {
      errors.companyCityStateZip = "Field cannot be empty"
    }
    if (!formData.company.country.trim()) {
      errors.companyCountry = "Field cannot be empty"
    }

    if (!formData.vendor.name.trim()) {
      errors.vendorName = "Field cannot be empty"
    }
    if (!formData.vendor.address.trim()) {
      errors.vendorAddress = "Field cannot be empty"
    }
    if (!formData.vendor.cityStateZip.trim()) {
      errors.vendorCityStateZip = "Field cannot be empty"
    }
    if (!formData.vendor.country.trim()) {
      errors.vendorCountry = "Field cannot be empty"
    }

    if (!formData.orderInfo.poNumber.trim()) {
      errors.poNumber = "Field cannot be empty"
    } else if (!/^\d+$/.test(formData.orderInfo.poNumber)) {
      errors.poNumber = "PO Number must be an integer"
    }

    if (formData.company.cityStateZip && !/^\d+$/.test(formData.company.cityStateZip)) {
      errors.companyCityStateZip = "Pincode must be an integer"
    }

    if (formData.vendor.cityStateZip && !/^\d+$/.test(formData.vendor.cityStateZip)) {
      errors.vendorCityStateZip = "Pincode must be an integer"
    }

    formData.lineItems.forEach((item, index) => {
      if (!item.description.trim()) {
        errors[`lineItemDescription_${index}`] = "Field cannot be empty"
      }
      if (item.quantity <= 0) {
        errors[`lineItemQuantity_${index}`] = "Field cannot be empty"
      }
      if (item.rate < 0) {
        errors[`lineItemRate_${index}`] = "Cannot be negative"
      }
      if (item.gst < 0) {
        errors[`lineItemGst_${index}`] = "Cannot be negative"
      }
    })

    if (Object.keys(errors).length > 0) {
      console.warn("[PO][UI] Validation errors:", errors)
      console.log("[PO][UI] Form data state:", {
        company: {
          name: formData.company.name,
          contact: formData.company.contact,
          address: formData.company.address,
          cityStateZip: formData.company.cityStateZip,
          country: formData.company.country,
        },
        vendor: {
          name: formData.vendor.name,
          address: formData.vendor.address,
          cityStateZip: formData.vendor.cityStateZip,
          country: formData.vendor.country,
        },
        orderInfo: {
          poNumber: formData.orderInfo.poNumber,
        },
        lineItems: formData.lineItems.map((item, idx) => ({
          index: idx,
          description: item.description,
          quantity: item.quantity,
          rate: item.rate,
          gst: item.gst,
        })),
      })
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      console.warn("[PO][UI] Validation failed; blocking submit")
      return
    }

    setIsSubmitting(true)
    setSubmitStatus("idle")

    try {
      // Duplicate check first
      const dup = await checkDuplicate()
      if (dup?.exists) {
        setSubmitStatus("idle")
        setModal({
          title: "Duplicate entry not allowed",
          description: (
            <div>
              <div>An identical purchase order already exists in the system.</div>
              <div style={{ marginTop: 6 }}>
                You can download the PDF of the existing record or close this
                message to review your inputs.
              </div>
            </div>
          ),
          primaryText: "Download PDF",
          secondaryText: "Close",
          onPrimary: () => {
            setModal(null)
            // Reuse Export to PDF flow; it will detect duplicate and download
            exportToPDF()
          },
          onClose: () => setModal(null),
        })
        return
      }

      const payload = buildPurchaseOrderPayload(formData)
      console.log("[PO][UI] submit payload", payload)
      const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000"
      const response = await fetch(`${API_BASE_URL}/purchaseorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        const errText = await response.text()
        console.error("[PO][UI] submit failed", response.status, errText)
        throw new Error(`Failed to submit order (${response.status}): ${errText}`)
      }
      const responseData = await response.json()
      console.log("[PO][UI] submit success", responseData)
      const receivedUniqueId = responseData.unique_id || responseData.data?.unique_id || ""

      // Update Google Sheet with unique_id
      try {
        await updateGoogleSheet(receivedUniqueId)
      } catch (sheetError) {
        console.warn("[PO][UI] Google Sheet update failed, but order was submitted:", sheetError)
      }

      setSubmitStatus("success")
    } catch (error) {
      console.error("[PO][UI] Error submitting order:", error)
      setSubmitStatus("error")
    } finally {
      setIsSubmitting(false)
    }
  }

  const removeLineItem = (id) => {
    const updatedItems = formData.lineItems.filter((item) => item.id !== id)
    const totals = calculateTotals(updatedItems)
    setFormData({
      ...formData,
      lineItems: updatedItems,
      ...totals,
    })
  }

  return (
    <>
      <SimpleHeader />
      <div className="page-wrapper">
        <div className="po-header">
          <h1 className="po-title">Purchase Order</h1>
          <div className="po-logo">
            <div className="logo-badge">P</div>
            <div className="logo-text-group">
              <div className="logo-brand">Proquo.tech</div>
              <div className="logo-subtitle">procurement</div>
            </div>
          </div>
        </div>

        <div className="details-grid">
          <div className="detail-card">
            <h2 className="card-title">Buyer Details</h2>
            <div className="form-group">
              <label className="form-label">Buyer/Company Name</label>
              <Input
                value={formData.company.name}
                onChange={handleCompanyNameChange}
                ariaLabel="Company name"
                className="form-input"
                placeholder="Enter company name"
              />
              <ErrorMessage message={validationErrors.companyName} />
            </div>

            <div className="form-group">
              <label className="form-label">Company Address</label>
              <Input
                placeholder="Enter company address"
                value={formData.company.address}
                ariaLabel="Company address"
                onChange={updateNestedField("company", "address")}
                className="form-input"
              />
              <ErrorMessage message={validationErrors.companyAddress} />
            </div>

            <div className="form-group">
              <label className="form-label">Pincode</label>
              <Input
                placeholder="Enter pincode"
                value={formData.company.cityStateZip}
                ariaLabel="Company pincode"
                onChange={updateNumericField("company", "cityStateZip")}
                className="form-input"
              />
              <ErrorMessage message={validationErrors.companyCityStateZip} />
            </div>

            <div className="form-group">
              <label className="form-label">Country</label>
              <Input
                placeholder="Enter country"
                value={formData.company.country}
                ariaLabel="Company country"
                onChange={updateNestedField("company", "country")}
                className="form-input"
              />
              <ErrorMessage message={validationErrors.companyCountry} />
            </div>

            <div className="form-group">
              <label className="form-label">Order Date</label>
              <div className="date-input-wrapper">
                <Input
                  type="date"
                  value={formData.orderInfo.orderDate}
                  ariaLabel="Order date"
                  onChange={updateNestedField("orderInfo", "orderDate")}
                  className="form-input"
                />
                <Calendar className="date-icon" size={20} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Contact Person</label>
              <Input
                placeholder="Enter contact person name"
                value={formData.company.contact || ""}
                ariaLabel="Company contact"
                onChange={updateNestedField("company", "contact")}
                className="form-input"
              />
              <ErrorMessage message={validationErrors.companyContact} />
            </div>

            <div className="form-group">
              <label className="form-label">PO Number</label>
              <Input
                placeholder="Enter PO number"
                value={formData.orderInfo.poNumber}
                ariaLabel="PO number"
                onChange={updateNumericField("orderInfo", "poNumber")}
                className="form-input"
              />
              <ErrorMessage message={validationErrors.poNumber} />
            </div>
          </div>

          <div className="detail-card">
            <h2 className="card-title">Vendor Details</h2>
            <div className="form-group">
              <label className="form-label">Vendor Name</label>
              <Input
                placeholder="Enter vendor name"
                value={formData.vendor.name}
                ariaLabel="Vendor name"
                onChange={updateNestedField("vendor", "name")}
                className="form-input"
              />
              <ErrorMessage message={validationErrors.vendorName} />
            </div>

            <div className="form-group">
              <label className="form-label">Vendor Address</label>
              <Input
                placeholder="Enter vendor address"
                value={formData.vendor.address}
                ariaLabel="Vendor address"
                onChange={updateNestedField("vendor", "address")}
                className="form-input"
              />
              <ErrorMessage message={validationErrors.vendorAddress} />
            </div>

            <div className="form-group">
              <label className="form-label">Pincode</label>
              <Input
                placeholder="Enter pincode"
                value={formData.vendor.cityStateZip}
                ariaLabel="Vendor pincode"
                onChange={updateNumericField("vendor", "cityStateZip")}
                className="form-input"
              />
              <ErrorMessage message={validationErrors.vendorCityStateZip} />
            </div>

            <div className="form-group">
              <label className="form-label">Country</label>
              <Input
                placeholder="Enter country"
                value={formData.vendor.country}
                ariaLabel="Vendor country"
                onChange={updateNestedField("vendor", "country")}
                className="form-input"
              />
              <ErrorMessage message={validationErrors.vendorCountry} />
            </div>

            <div className="order-info-section">
              <h3 className="section-subtitle">Order Information</h3>
              <div className="form-group">
                <label className="form-label">PO Number</label>
                <Input
                  placeholder="Enter PO number"
                  value={formData.orderInfo.poNumber}
                  ariaLabel="PO number"
                  onChange={updateNumericField("orderInfo", "poNumber")}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Delivery Date</label>
                <div className="date-input-wrapper">
                  <Input
                    type="date"
                    value={formData.orderInfo.deliveryDate}
                    ariaLabel="Delivery date"
                    onChange={updateNestedField("orderInfo", "deliveryDate")}
                    className="form-input"
                  />
                  <Calendar className="date-icon" size={20} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="line-items-card">
          <h2 className="card-title">Line Items</h2>
          <div className="table-wrapper">
            <table className="line-items-table">
              <thead>
                <tr>
                  <th className="col-description">Item Description</th>
                  <th className="col-quantity">Quantity</th>
                  <th className="col-rate">Rate</th>
                  <th className="col-gst">GST (%)</th>
                  <th className="col-amount">Amount</th>
                  <th className="col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {formData.lineItems.map((item, index) => (
                  <tr key={item.id}>
                    <td className="col-description">
                      <Input
                        placeholder="Enter item description"
                        value={item.description}
                        ariaLabel="Item description"
                        onChange={(e) => updateLineItem(item.id, "description", e.target.value)}
                        className="table-input"
                      />
                      <ErrorMessage message={validationErrors[`lineItemDescription_${index}`]} />
                    </td>
                    <td className="col-quantity">
                      <Input
                        type="number"
                        min="0"
                        value={item.quantity}
                        ariaLabel="Quantity"
                        onChange={(e) => updateLineItem(item.id, "quantity", Number.parseFloat(e.target.value) || 0)}
                        className="table-input"
                      />
                      <ErrorMessage message={validationErrors[`lineItemQuantity_${index}`]} />
                    </td>
                    <td className="col-rate">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.rate.toFixed(2)}
                        ariaLabel="Rate"
                        onChange={(e) => updateLineItem(item.id, "rate", Number.parseFloat(e.target.value) || 0)}
                        className="table-input"
                      />
                      <ErrorMessage message={validationErrors[`lineItemRate_${index}`]} />
                    </td>
                    <td className="col-gst">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.gst.toFixed(2)}
                        ariaLabel="GST"
                        onChange={(e) => updateLineItem(item.id, "gst", Number.parseFloat(e.target.value) || 0)}
                        className="table-input"
                      />
                      <ErrorMessage message={validationErrors[`lineItemGst_${index}`]} />
                    </td>
                    <td className="col-amount">₹ {item.amount.toFixed(2)}</td>
                    <td className="col-actions">
                      <button
                        type="button"
                        onClick={() => removeLineItem(item.id)}
                        className="delete-btn"
                        aria-label="Remove line item"
                      >
                        <X size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button type="button" onClick={addLineItem} className="add-line-item-btn">
            <Plus size={18} />
            Add Line Item
          </button>
        </div>

        <div className="footer-section">
          <div className="totals-group">
            <div className="total-row total-final">
              <span className="total-label">Total: ₹ {formData.total.toFixed(2)}</span>
            </div>
          </div>

          <div className="action-buttons">
            <Button onClick={exportToPDF} className="btn-secondary">
              Export to PDF
            </Button>
            {/* <Button onClick={exportToJSON} className="btn-secondary">
              Export to JSON
            </Button> */}
            <Button onClick={handleSubmit} disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? "Submitting..." : "Submit Order"}
            </Button>
          </div>
        </div>

        {modal && (
          <Modal
            title={modal.title}
            description={modal.description}
            primaryText={modal.primaryText}
            secondaryText={modal.secondaryText}
            onPrimary={modal.onPrimary}
            onClose={modal.onClose}
          />
        )}

        {submitStatus === "success" && (
          <div className="status success">
            Purchase order submitted successfully!
          </div>
        )}
        {submitStatus === "error" && (
          <div className="status error">Failed to submit purchase order. Please try again.</div>
        )}
      </div>
    </>
  )
}
