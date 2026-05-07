import express from "express";
import fs from "fs";
import path from "path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { exec } from "child_process";

const router = express.Router();

router.post("/print", async (req, res) => {
  try {
    const data = req.body;

    const templatePath = path.resolve("templates/Sample_Palamboon.docx");

    if (!fs.existsSync(templatePath)) {
      return res.status(404).json({
        message: "Template not found",
        path: templatePath,
      });
    }

    const tempDir = path.resolve("temp");

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }

    const content = fs.readFileSync(templatePath, "binary");
    const zip = new PizZip(content);

    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    doc.render(data);

    const outputDocx = path.join(tempDir, "output.docx");
    const outputPdf = path.join(tempDir, "output.pdf");

    fs.writeFileSync(
      outputDocx,
      doc.getZip().generate({ type: "nodebuffer" })
    );

    exec(
      `libreoffice --headless --convert-to pdf "${outputDocx}" --outdir "${tempDir}"`,
      (err, stdout, stderr) => {
        console.log("LibreOffice stdout:", stdout);
        console.error("LibreOffice stderr:", stderr);

        if (err) {
          console.error("Conversion error:", err);
          return res.status(500).send("PDF conversion failed");
        }

        if (!fs.existsSync(outputPdf)) {
          return res.status(500).json({
            message: "PDF was not generated",
            expectedPath: outputPdf,
          });
        }

        const pdfBuffer = fs.readFileSync(outputPdf);

        res.set({
          "Content-Type": "application/pdf",
          "Content-Disposition": "inline; filename=form.pdf",
        });

        res.send(pdfBuffer);
      }
    );
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).send("Error generating document");
  }
});

export default router;