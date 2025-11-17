import React from "react";
import "./SimpleHeader.css";

function SimpleHeader() {
  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;700&display=swap" rel="stylesheet" />
      <header className="simple-header">
        <div className="logo-container">
          <img
            src="/procorro-logo.png"
            alt="Procorro"
            style={{ height: "40px", width: "auto" }}
          />
        </div>
      </header>
    </>
  );
}

export default SimpleHeader;
