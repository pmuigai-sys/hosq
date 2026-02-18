import os
try:
    from docx import Document
    from docx.shared import Inches, Pt
except ImportError:
    print("python-docx not found. Please install it first.")
    exit(1)

def create_project_doc():
    doc = Document()
    
    # Title Page
    title = doc.add_heading('HOSQ: Hospital Queue Management System', 0)
    title.alignment = 1 # Center
    
    doc.add_paragraph('Comprehensive System Documentation and Setup Guide').alignment = 1
    doc.add_paragraph('Author: Peter Thairu Muigai').alignment = 1
    doc.add_paragraph('Version: 1.0.0').alignment = 1
    doc.add_page_break()
    
    # Architecture Section
    doc.add_heading('1. System Architecture', level=1)
    doc.add_paragraph('The Hospital Queue System (Hosq) is a real-time patient management application built with React, Vite, and Supabase.')
    
    doc.add_heading('Technology Stack', level=2)
    tech = [
        ('Frontend', 'React 18, Vite, TypeScript'),
        ('Styling', 'Tailwind CSS'),
        ('Backend', 'Supabase (PostgreSQL + Auth + Real-time)'),
        ('SMS', "Africa's Talking")
    ]
    for key, value in tech:
        p = doc.add_paragraph(style='List Bullet')
        p.add_run(f'{key}: ').bold = True
        p.add_run(value)
        
    doc.add_page_break()
    
    # Setup Guide
    doc.add_heading('2. Setup and Installation', level=1)
    doc.add_paragraph('Follow these steps to set up the project locally.')
    
    steps = [
        'Clone the repository.',
        'Install dependencies: npm install',
        'Configure .env.local with Supabase credentials.',
        'Run migrations in Supabase SQL editor.',
        'Start the dev server: npm run dev'
    ]
    for step in steps:
        doc.add_paragraph(step, style='List Number')

    doc.add_page_break()
    
    # Africa's Talking
    doc.add_heading("3. Africa's Talking SMS Integration", level=1)
    doc.add_paragraph("The system is integrated with Africa's Talking for the Kenyan market.")
    doc.add_paragraph("Required Credentials:", style='Normal')
    doc.add_paragraph("AFRICA_STALKING_API_KEY", style='List Bullet')
    doc.add_paragraph("AFRICA_STALKING_USERNAME", style='List Bullet')
    
    # Save the document
    output_path = 'f:/hosq/HOSQ_Project_Documentation.docx'
    doc.save(output_path)
    print(f"✅ Success! Document created at {output_path}")

if __name__ == "__main__":
    create_project_doc()
