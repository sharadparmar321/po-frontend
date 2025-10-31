import React from "react";
import "./SimpleHeader.css";

function SimpleHeader() {
  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;700&display=swap" rel="stylesheet" />
      <header className="simple-header">
        <div className="logo-container">
          <div className="logo-wrapper">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g clipPath="url(#clip0_114_6)">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M14.6667 1.33333H10.2222V5.7778H5.7778V10.2222H1.33333V14.6667H14.6667V1.33333Z"
                  fill="#120D1C"
                />
              </g>
              <defs>
                <clipPath id="clip0_114_6">
                  <rect width="16" height="16" fill="white" />
                </clipPath>
              </defs>
            </svg>
          </div>
          <h1 className="logo-text">proquo.tech</h1>
        </div>
      </header>
    </>
  );
}

export default SimpleHeader;
