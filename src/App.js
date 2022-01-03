import React from 'react';
import { Routes, Route } from "react-router-dom"
import PDFTron from './pdftron';
import './App.css';

const App = () => {

  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<PDFTron />} />
        <Route path="/?pdf_url=" element={<PDFTron />} />
      </Routes>
    </div>
  );
};

export default App;
