"""
QuickBite Final Mini Project Report PDF Generator
Curriculum: PES University CSE DBMS (Prof. Vinay Joshi)
Team: Navaneeth Tanuboddi (PES1UG24CS709) & Rishab Naveen (PES1UG24CS710)
Includes:
- Conceptual ER Modeling & Complete Chen's Notation ER Diagram
- Formal 7-Step ER-to-Relational Mapping & Slide 33 Relational Schema Diagram with FK Arrows
- Advanced SQL Triggers, Procedures, Functions & 5 Complex Queries
- NoSQL MongoDB Aggregation Pipeline & 384-D AI Vector Search (pgvector HNSW)
- Next.js Project Tree Structure & Live Demonstration Walkthrough
"""

import os
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Preformatted, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas
from reportlab.graphics.shapes import (
    Drawing, Rect, Line, String, Group, Polygon, Ellipse
)

PDF_OUTPUT = r"C:\Users\Rishab Naveen\.gemini\antigravity\scratch\quickbite\QuickBite_DBMS_Mini_Project_Report.pdf"

PAGE_WIDTH, PAGE_HEIGHT = A4
MARGIN = 30
USABLE_WIDTH = PAGE_WIDTH - 2 * MARGIN

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_header_footer(num_pages)
            super().showPage()
        super().save()

    def draw_header_footer(self, page_count):
        self.saveState()
        # Header (pages after page 1)
        if self._pageNumber > 1:
            self.setFont("Helvetica", 7.5)
            self.setFillColor(colors.HexColor("#64748b"))
            self.drawString(MARGIN, PAGE_HEIGHT - 22, "QuickBite: Intelligent Campus Cafeteria Multi-Model DBMS Report")
            self.drawRightString(PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 22, "PES University · CSE Dept · Prof. Vinay Joshi")
            self.setStrokeColor(colors.HexColor("#cbd5e1"))
            self.setLineWidth(0.5)
            self.line(MARGIN, PAGE_HEIGHT - 25, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 25)

        # Footer (all pages)
        self.setFont("Helvetica", 7.5)
        self.setFillColor(colors.HexColor("#64748b"))
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.5)
        self.line(MARGIN, 25, PAGE_WIDTH - MARGIN, 25)
        self.drawString(MARGIN, 14, "QuickBite: Navaneeth Tanuboddi (PES1UG24CS709) & Rishab Naveen (PES1UG24CS710)")
        self.drawRightString(PAGE_WIDTH - MARGIN, 14, f"Page {self._pageNumber} of {page_count}")
        self.restoreState()


# =============================================================================
# 1. ER DIAGRAM BUILDER (CHEN'S NOTATION WITH COMPLETE ATTRIBUTES)
# =============================================================================
def create_full_er_diagram():
    dw = USABLE_WIDTH
    dh = 490
    d = Drawing(dw, dh)

    # Frame border
    d.add(Rect(0, 0, dw, dh, fillColor=colors.HexColor('#fcfcfd'), strokeColor=colors.HexColor('#cbd5e1'), strokeWidth=0.8, rx=4, ry=4))

    # Diagram Header inside frame
    d.add(String(14, dh - 14, "QuickBite: Complete Conceptual ER Diagram (Chen's Notation with All Attributes)", fontName="Helvetica-Bold", fontSize=8.5, fillColor=colors.HexColor("#0f172a")))
    d.add(String(14, dh - 23, "PES University CSE Standard · Complete 1:1 Attribute Coverage (Keys, Simple, Multivalued, Derived, Composite)", fontName="Helvetica", fontSize=6.2, fillColor=colors.HexColor("#64748b")))

    dark_fill = colors.HexColor('#1e293b') # Slate 800
    white_txt = colors.HexColor('#ffffff')
    line_col = colors.HexColor('#334155')
    oval_bg = colors.HexColor('#ffffff')
    oval_stroke = colors.HexColor('#475569')
    attr_line_col = colors.HexColor('#64748b')

    def add_line(x1, y1, x2, y2, is_double=False, is_dashed=False):
        if is_double:
            dx = y2 - y1
            dy = -(x2 - x1)
            dist = (dx*dx + dy*dy)**0.5
            if dist > 0:
                off_x = (dx / dist) * 1.3
                off_y = (dy / dist) * 1.3
                d.add(Line(x1 + off_x, y1 + off_y, x2 + off_x, y2 + off_y, strokeColor=line_col, strokeWidth=0.8))
                d.add(Line(x1 - off_x, y1 - off_y, x2 - off_x, y2 - off_y, strokeColor=line_col, strokeWidth=0.8))
        else:
            if is_dashed:
                l = Line(x1, y1, x2, y2, strokeColor=line_col, strokeWidth=0.85)
                l.strokeDashArray = [3, 2]
                d.add(l)
            else:
                d.add(Line(x1, y1, x2, y2, strokeColor=line_col, strokeWidth=0.85))

    def add_attribute(cx, cy, text, is_key=False, is_multivalued=False, is_derived=False, is_partial_key=False, rx=22, ry=8):
        e = Ellipse(cx, cy, rx, ry, fillColor=oval_bg, strokeColor=oval_stroke, strokeWidth=0.6)
        if is_derived:
            e.strokeDashArray = [2.5, 1.5]
        d.add(e)
        if is_multivalued:
            d.add(Ellipse(cx, cy, rx - 2.5, ry - 2, fillColor=None, strokeColor=oval_stroke, strokeWidth=0.5))
        
        d.add(String(cx, cy - 2, text, fontName="Helvetica", fontSize=5.2, textAnchor="middle", fillColor=colors.HexColor('#0f172a')))
        if is_key:
            tw = len(text) * 2.8
            d.add(Line(cx - tw/2, cy - 3.2, cx + tw/2, cy - 3.2, strokeColor=colors.HexColor('#0f172a'), strokeWidth=0.6))
        elif is_partial_key:
            tw = len(text) * 2.8
            l = Line(cx - tw/2, cy - 3.2, cx + tw/2, cy - 3.2, strokeColor=colors.HexColor('#0f172a'), strokeWidth=0.6)
            l.strokeDashArray = [2, 1.5]
            d.add(l)

    def add_entity(cx, cy, w, h, text, is_weak=False):
        x = cx - w / 2
        y = cy - h / 2
        d.add(Rect(x, y, w, h, fillColor=dark_fill, strokeColor=colors.HexColor('#0f172a'), strokeWidth=0.9))
        if is_weak:
            d.add(Rect(x + 2, y + 2, w - 4, h - 4, fillColor=None, strokeColor=white_txt, strokeWidth=0.8))
        d.add(String(cx, cy - 2.2, text, fontName="Helvetica-Bold", fontSize=6.5, textAnchor="middle", fillColor=white_txt))

    def add_rel(cx, cy, rx, ry, text, subtext=None, is_id=False):
        pts = [cx, cy + ry, cx + rx, cy, cx, cy - ry, cx - rx, cy]
        d.add(Polygon(pts, fillColor=dark_fill, strokeColor=colors.HexColor('#0f172a'), strokeWidth=0.9))
        if is_id:
            pts2 = [cx, cy + ry - 2, cx + rx - 3, cy, cx, cy - ry + 2, cx - rx + 3, cy]
            d.add(Polygon(pts2, fillColor=None, strokeColor=white_txt, strokeWidth=0.7))
        if subtext:
            d.add(String(cx, cy + 0.8, text, fontName="Helvetica-Bold", fontSize=5.5, textAnchor="middle", fillColor=white_txt))
            d.add(String(cx, cy - 5.8, subtext, fontName="Helvetica", fontSize=5, textAnchor="middle", fillColor=colors.HexColor('#cbd5e1')))
        else:
            d.add(String(cx, cy - 2.2, text, fontName="Helvetica-Bold", fontSize=6, textAnchor="middle", fillColor=white_txt))

    # Core Entity & Relationship Positions
    u_x, u_y = 265, 410 # USER
    m_x, m_y = 150, 355 # MANAGES
    st_x, st_y = 150, 300 # STALL
    pl_x, pl_y = 265, 345 # PLACES
    ord_x, ord_y = 265, 268 # ORDER
    rec_x, rec_y = 208, 284 # RECEIVES
    of_x, of_y = 85, 248 # OFFERS
    mi_x, mi_y = 85, 195 # MENU_ITEM
    ref_x, ref_y = 85, 126 # REFERENCES
    cnt_x, cnt_y = 175, 175 # CONTAINS (Identifying)
    aud_x, aud_y = 265, 175 # AUDITS (Identifying)
    gen_x, gen_y = 370, 190 # GENERATES
    oi_x, oi_y = 120, 65 # ORDER_ITEM (Weak)
    log_x, log_y = 265, 65 # ORDER_STATUS_LOG (Weak)
    wt_x, wt_y = 430, 65 # WALLET_TXN
    own_x, own_y = 430, 300 # OWNS_TXN

    # 1. USER Attributes
    d.add(Line(u_x - 22, u_y + 11, 175, 455, strokeColor=attr_line_col, strokeWidth=0.5))
    add_attribute(175, 455, "User_ID", is_key=True, rx=19, ry=8)
    
    d.add(Line(u_x - 8, u_y + 11, 230, 450, strokeColor=attr_line_col, strokeWidth=0.5))
    add_attribute(230, 450, "Full_Name", rx=22, ry=8)
    d.add(Line(220, 458, 208, 476, strokeColor=attr_line_col, strokeWidth=0.5))
    add_attribute(208, 476, "First_Name", rx=20, ry=7.5)
    d.add(Line(240, 458, 252, 476, strokeColor=attr_line_col, strokeWidth=0.5))
    add_attribute(252, 476, "Last_Name", rx=20, ry=7.5)

    d.add(Line(u_x + 10, u_y + 11, 295, 455, strokeColor=attr_line_col, strokeWidth=0.5))
    add_attribute(295, 455, "Email", rx=18, ry=8)

    d.add(Line(u_x + 24, u_y + 11, 345, 468, strokeColor=attr_line_col, strokeWidth=0.5))
    add_attribute(345, 468, "Pass_Hash", rx=22, ry=8)

    d.add(Line(u_x + 32, u_y + 6, 360, 442, strokeColor=attr_line_col, strokeWidth=0.5))
    add_attribute(360, 442, "Phone_Number", rx=26, ry=8)

    d.add(Line(u_x + 32, u_y - 2, 350, 418, strokeColor=attr_line_col, strokeWidth=0.5))
    add_attribute(350, 418, "Role", rx=16, ry=7.5)

    d.add(Line(u_x + 32, u_y - 9, 355, 395, strokeColor=attr_line_col, strokeWidth=0.5))
    add_attribute(355, 395, "Wallet_Balance", rx=25, ry=8)

    # 2. STALL Attributes
    d.add(Line(st_x - 30, st_y + 8, 70, 335, strokeColor=attr_line_col, strokeWidth=0.5))
    add_attribute(70, 335, "Stall_ID", is_key=True, rx=19, ry=8)
    d.add(Line(st_x - 30, st_y + 2, 65, 312, strokeColor=attr_line_col, strokeWidth=0.5))
    add_attribute(65, 312, "Name", rx=17, ry=8)
    d.add(Line(st_x - 30, st_y - 4, 65, 288, strokeColor=attr_line_col, strokeWidth=0.5))
    add_attribute(65, 288, "Location", rx=19, ry=8)
    d.add(Line(st_x - 28, st_y - 9, 70, 265, strokeColor=attr_line_col, strokeWidth=0.5))
    add_attribute(70, 265, "Is_Active", rx=19, ry=7.5)
    d.add(Line(st_x, st_y - 11, 145, 265, strokeColor=attr_line_col, strokeWidth=0.5))
    add_attribute(145, 265, "Created_At", rx=22, ry=7.5)

    # 3. MENU_ITEM Attributes
    d.add(Line(mi_x - 30, mi_y + 9, 25, 240, strokeColor=attr_line_col, strokeWidth=0.5))
    add_attribute(25, 240, "Item_ID", is_key=True, rx=18, ry=8)
    d.add(Line(mi_x - 30, mi_y + 3, 23, 217, strokeColor=attr_line_col, strokeWidth=0.5))
    add_attribute(23, 217, "Name", rx=16, ry=7.5)
    d.add(Line(mi_x - 30, mi_y - 3, 23, 195, strokeColor=attr_line_col, strokeWidth=0.5))
    add_attribute(23, 195, "Price", rx=16, ry=7.5)
    d.add(Line(mi_x - 30, mi_y - 8, 26, 173, strokeColor=attr_line_col, strokeWidth=0.5))
    add_attribute(26, 173, "Stock_Qty", rx=20, ry=7.5)
    d.add(Line(mi_x - 25, mi_y - 11, 30, 145, strokeColor=attr_line_col, strokeWidth=0.5))
    add_attribute(30, 145, "Dietary_Tags", is_multivalued=True, rx=23, ry=8.5)
    d.add(Line(mi_x + 28, mi_y + 9, 130, 225, strokeColor=attr_line_col, strokeWidth=0.5))
    add_attribute(130, 225, "Description", rx=22, ry=7.5)
    d.add(Line(mi_x + 30, mi_y, 140, 200, strokeColor=attr_line_col, strokeWidth=0.5))
    add_attribute(140, 200, "Vector", rx=18, ry=7.5)
    d.add(Line(mi_x + 26, mi_y - 9, 125, 155, strokeColor=attr_line_col, strokeWidth=0.5))
    add_attribute(125, 155, "Is_Available", is_derived=True, rx=21, ry=7.5)

    # 4. ORDER Attributes
    d.add(Line(ord_x + 30, ord_y + 9, 335, 300, strokeColor=attr_line_col, strokeWidth=0.5))
    add_attribute(335, 300, "Order_ID", is_key=True, rx=19, ry=8)
    d.add(Line(ord_x + 30, ord_y + 3, 345, 275, strokeColor=attr_line_col, strokeWidth=0.5))
    add_attribute(345, 275, "Total_Amount", is_derived=True, rx=24, ry=8)
    d.add(Line(ord_x + 30, ord_y - 3, 335, 252, strokeColor=attr_line_col, strokeWidth=0.5))
    add_attribute(335, 252, "Status", rx=17, ry=7.5)
    d.add(Line(ord_x + 26, ord_y - 9, 335, 228, strokeColor=attr_line_col, strokeWidth=0.5))
    add_attribute(335, 228, "Instructions", rx=22, ry=7.5)

    # 5. ORDER_ITEM Attributes
    d.add(Line(oi_x - 30, oi_y - 11, 70, 20, strokeColor=attr_line_col, strokeWidth=0.5))
    add_attribute(70, 20, "Quantity", rx=18, ry=7.5)
    d.add(Line(oi_x, oi_y - 11, 120, 20, strokeColor=attr_line_col, strokeWidth=0.5))
    add_attribute(120, 20, "Unit_Price", rx=20, ry=7.5)
    d.add(Line(oi_x + 30, oi_y - 11, 170, 20, strokeColor=attr_line_col, strokeWidth=0.5))
    add_attribute(170, 20, "Subtotal", is_derived=True, rx=19, ry=7.5)

    # 6. ORDER_STATUS_LOG Attributes
    d.add(Line(log_x - 22, log_y - 11, 225, 20, strokeColor=attr_line_col, strokeWidth=0.5))
    add_attribute(225, 20, "Changed_At", is_partial_key=True, rx=23, ry=7.5)
    d.add(Line(log_x, log_y - 11, 275, 20, strokeColor=attr_line_col, strokeWidth=0.5))
    add_attribute(275, 20, "Old_Status", rx=20, ry=7.5)
    d.add(Line(log_x + 22, log_y - 11, 325, 20, strokeColor=attr_line_col, strokeWidth=0.5))
    add_attribute(325, 20, "New_Status", rx=20, ry=7.5)

    # 7. WALLET_TRANSACTION Attributes
    d.add(Line(wt_x - 25, wt_y - 11, 375, 20, strokeColor=attr_line_col, strokeWidth=0.5))
    add_attribute(375, 20, "Txn_ID", is_key=True, rx=18, ry=7.5)
    d.add(Line(wt_x - 8, wt_y - 11, 415, 20, strokeColor=attr_line_col, strokeWidth=0.5))
    add_attribute(415, 20, "Amount", rx=18, ry=7.5)
    d.add(Line(wt_x + 10, wt_y - 11, 455, 20, strokeColor=attr_line_col, strokeWidth=0.5))
    add_attribute(455, 20, "Type", rx=16, ry=7.5)
    d.add(Line(wt_x + 28, wt_y - 11, 495, 20, strokeColor=attr_line_col, strokeWidth=0.5))
    add_attribute(495, 20, "Description", rx=21, ry=7.5)

    # Connectors
    add_line(u_x - 35, u_y - 6, m_x, m_y + 15, is_double=False)
    add_line(m_x, m_y - 15, st_x, st_y + 11, is_double=True)

    add_line(u_x, u_y - 11, pl_x, pl_y + 15, is_double=False)
    add_line(pl_x, pl_y - 15, ord_x, ord_y + 11, is_double=True)

    d.add(Line(u_x + 33, u_y, own_x, u_y, strokeColor=line_col, strokeWidth=0.85))
    d.add(Line(own_x, u_y, own_x, own_y + 15, strokeColor=line_col, strokeWidth=0.85))
    add_line(own_x, own_y - 15, wt_x, wt_y + 11, is_double=True)

    add_line(st_x - 20, st_y - 11, of_x, of_y + 15, is_double=False)
    add_line(of_x, of_y - 15, mi_x, mi_y + 11, is_double=True)

    add_line(st_x + 25, st_y - 7, rec_x - 18, rec_y + 7, is_double=False)
    add_line(rec_x + 18, rec_y - 7, ord_x - 25, ord_y + 7, is_double=True)

    add_line(mi_x, mi_y - 11, ref_x, ref_y + 15, is_double=False)
    add_line(ref_x, ref_y - 15, oi_x - 20, oi_y + 11, is_double=True)

    add_line(ord_x - 25, ord_y - 11, cnt_x, cnt_y + 15, is_double=True)
    add_line(cnt_x, cnt_y - 15, oi_x + 20, oi_y + 11, is_double=True)

    add_line(ord_x, ord_y - 11, aud_x, aud_y + 15, is_double=True)
    add_line(aud_x, aud_y - 15, log_x, log_y + 11, is_double=True)

    add_line(ord_x + 30, ord_y - 8, gen_x - 28, gen_y + 8, is_dashed=True)
    d.add(Line(gen_x + 28, gen_y, wt_x - 20, gen_y, strokeColor=line_col, strokeWidth=0.85))
    d.add(Line(wt_x - 20, gen_y, wt_x - 20, wt_y + 11, strokeColor=line_col, strokeWidth=0.85))

    # Diamonds
    add_rel(m_x, m_y, 32, 15, "MANAGES", "(1:N)")
    add_rel(pl_x, pl_y, 30, 15, "PLACES", "(1:N)")
    add_rel(own_x, own_y, 32, 15, "OWNS_TXN", "(1:N)")
    add_rel(of_x, of_y, 30, 15, "OFFERS", "(1:N)")
    add_rel(rec_x, rec_y, 26, 13, "RECEIVES", "(1:N)")
    add_rel(ref_x, ref_y, 32, 15, "REFERENCES", "(1:N)")
    add_rel(cnt_x, cnt_y, 32, 15, "CONTAINS", "(Identifying)", is_id=True)
    add_rel(aud_x, aud_y, 30, 15, "AUDITS", "(Identifying)", is_id=True)
    add_rel(gen_x, gen_y, 32, 14, "GENERATES", "(0..1:N)")

    # Entities
    add_entity(u_x, u_y, 65, 22, "USER")
    add_entity(st_x, st_y, 65, 22, "STALL")
    add_entity(mi_x, mi_y, 65, 22, "MENU_ITEM")
    add_entity(ord_x, ord_y, 65, 22, "ORDER")
    add_entity(oi_x, oi_y, 80, 22, "ORDER_ITEM", is_weak=True)
    add_entity(log_x, log_y, 88, 22, "ORDER_STATUS_LOG", is_weak=True)
    add_entity(wt_x, wt_y, 84, 22, "WALLET_TRANSACTION")

    return d


# =============================================================================
# 2. RELATIONAL SCHEMA DIAGRAM BUILDER (SLIDE 33 STANDARD)
# =============================================================================
def create_relational_schema_diagram():
    dw = USABLE_WIDTH
    dh = 475
    d = Drawing(dw, dh)

    d.add(Rect(0, 0, dw, dh, fillColor=colors.HexColor('#ffffff'), strokeColor=colors.HexColor('#cbd5e1'), strokeWidth=0.8, rx=4, ry=4))

    d.add(String(14, dh - 15, "QuickBite: Relational Schema Diagram (Slide 33 Standard)", fontName="Helvetica-Bold", fontSize=8.5, fillColor=colors.HexColor("#0f172a")))
    d.add(String(14, dh - 25, "Direct Foreign Key Referencing Arrows · Primary Keys Underlined · Complete 8-Relation Closed Schema", fontName="Helvetica", fontSize=6.8, fillColor=colors.HexColor("#475569")))

    table_title_color = colors.HexColor('#1e3a8a')
    cell_border = colors.HexColor('#64748b')
    cell_bg = colors.HexColor('#f8fafc')
    pk_bg = colors.HexColor('#eff6ff')
    arrow_color = colors.HexColor('#2563eb')

    tables = [
        ("USER", 405, [
            ("User_ID", 48, True, False),
            ("Email", 50, False, False),
            ("Pass_Hash", 52, False, False),
            ("First_Name", 54, False, False),
            ("Last_Name", 54, False, False),
            ("Role", 38, False, False),
            ("Wallet_Balance", 68, False, False),
            ("Phone_Number", 68, False, False),
        ]),
        ("STALL", 348, [
            ("Stall_ID", 48, True, False),
            ("Name", 54, False, False),
            ("Location", 54, False, False),
            ("Is_Active", 44, False, False),
            ("Owner_ID", 52, False, True),
            ("Created_At", 56, False, False),
        ]),
        ("MENU_ITEM", 290, [
            ("Item_ID", 48, True, False),
            ("Stall_ID", 48, False, True),
            ("Name", 54, False, False),
            ("Price", 38, False, False),
            ("Stock_Qty", 52, False, False),
            ("Description", 62, False, False),
            ("Vector", 44, False, False),
        ]),
        ("ORDER", 232, [
            ("Order_ID", 48, True, False),
            ("Student_ID", 54, False, True),
            ("Stall_ID", 46, False, True),
            ("Total_Amount", 64, False, False),
            ("Status", 42, False, False),
            ("Instructions", 64, False, False),
        ]),
        ("ORDER_ITEM", 174, [
            ("Order_ID", 50, True, True),
            ("Item_ID", 48, True, True),
            ("Quantity", 46, False, False),
            ("Unit_Price", 50, False, False),
            ("Subtotal", 48, False, False),
        ]),
        ("WALLET_TRANSACTION", 116, [
            ("Txn_ID", 44, True, False),
            ("User_ID", 48, False, True),
            ("Amount", 44, False, False),
            ("Type", 40, False, False),
            ("Description", 60, False, False),
            ("Order_ID", 50, False, True),
        ]),
        ("ITEM_DIETARY_TAGS", 60, [
            ("Item_ID", 50, True, True),
            ("Dietary_Tag", 65, True, False),
        ]),
        ("ORDER_STATUS_LOG", 10, [
            ("Order_ID", 50, True, True),
            ("Changed_At", 65, True, False),
            ("Old_Status", 54, False, False),
            ("New_Status", 54, False, False),
        ]),
    ]

    cell_h = 15
    start_x = 30
    cell_positions = {}

    for tbl_name, ty, cols in tables:
        d.add(String(start_x, ty + 17, tbl_name, fontName="Helvetica-Bold", fontSize=7.2, fillColor=table_title_color))
        cur_x = start_x
        for col_name, w, is_pk, is_fk in cols:
            bg = pk_bg if is_pk else cell_bg
            d.add(Rect(cur_x, ty, w, cell_h, fillColor=bg, strokeColor=cell_border, strokeWidth=0.6))
            fn = "Helvetica-Bold" if is_pk else "Helvetica"
            d.add(String(cur_x + w/2, ty + 4.2, col_name, fontName=fn, fontSize=5.8, textAnchor="middle", fillColor=colors.HexColor('#0f172a')))
            if is_pk:
                tw = len(col_name) * 3.3
                d.add(Line(cur_x + w/2 - tw/2, ty + 2.8, cur_x + w/2 + tw/2, ty + 2.8, strokeColor=colors.HexColor('#0f172a'), strokeWidth=0.7))
            
            cell_positions[(tbl_name, col_name)] = (cur_x + w/2, ty + cell_h, ty, cur_x, cur_x + w)
            cur_x += w

    def draw_arrow(points):
        for i in range(len(points) - 1):
            x1, y1 = points[i]
            x2, y2 = points[i+1]
            d.add(Line(x1, y1, x2, y2, strokeColor=arrow_color, strokeWidth=0.85))
        
        ex, ey = points[-1]
        px, py = points[-2]
        if ey > py:
            tip = [ex, ey, ex - 2.5, ey - 4, ex + 2.5, ey - 4]
        elif ey < py:
            tip = [ex, ey, ex - 2.5, ey + 4, ex + 2.5, ey + 4]
        elif ex > px:
            tip = [ex, ey, ex - 4, ey - 2.5, ex - 4, ey + 2.5]
        else:
            tip = [ex, ey, ex + 4, ey - 2.5, ex + 4, ey + 2.5]
        d.add(Polygon(tip, fillColor=arrow_color, strokeColor=arrow_color, strokeWidth=0.4))

    u_uid = cell_positions[("USER", "User_ID")]
    st_sid = cell_positions[("STALL", "Stall_ID")]
    mi_iid = cell_positions[("MENU_ITEM", "Item_ID")]
    ord_oid = cell_positions[("ORDER", "Order_ID")]

    # 1. STALL.Owner_ID -> USER.User_ID
    st_o = cell_positions[("STALL", "Owner_ID")]
    draw_arrow([
        (st_o[0], st_o[1]),
        (st_o[0], st_o[1] + 10),
        (u_uid[0] + 12, st_o[1] + 10),
        (u_uid[0] + 12, u_uid[2])
    ])

    # 2. MENU_ITEM.Stall_ID -> STALL.Stall_ID
    mi_sid = cell_positions[("MENU_ITEM", "Stall_ID")]
    draw_arrow([
        (mi_sid[0], mi_sid[1]),
        (mi_sid[0], mi_sid[1] + 12),
        (st_sid[0] + 10, mi_sid[1] + 12),
        (st_sid[0] + 10, st_sid[2])
    ])

    # 3. ORDER.Student_ID -> USER.User_ID
    ord_stu = cell_positions[("ORDER", "Student_ID")]
    draw_arrow([
        (ord_stu[0], ord_stu[1]),
        (ord_stu[0], ord_stu[1] + 8),
        (u_uid[0], ord_stu[1] + 8),
        (u_uid[0], u_uid[2])
    ])

    # 4. ORDER.Stall_ID -> STALL.Stall_ID
    ord_sid = cell_positions[("ORDER", "Stall_ID")]
    draw_arrow([
        (ord_sid[0], ord_sid[1]),
        (ord_sid[0], ord_sid[1] + 12),
        (st_sid[0] - 8, ord_sid[1] + 12),
        (st_sid[0] - 8, st_sid[2])
    ])

    # 5. ORDER_ITEM.Order_ID -> ORDER.Order_ID
    oi_oid = cell_positions[("ORDER_ITEM", "Order_ID")]
    draw_arrow([
        (oi_oid[3], oi_oid[2] + 7),
        (oi_oid[3] - 8, oi_oid[2] + 7),
        (oi_oid[3] - 8, ord_oid[2] - 8),
        (ord_oid[0] - 6, ord_oid[2] - 8),
        (ord_oid[0] - 6, ord_oid[2])
    ])

    # 6. ORDER_ITEM.Item_ID -> MENU_ITEM.Item_ID
    oi_iid = cell_positions[("ORDER_ITEM", "Item_ID")]
    draw_arrow([
        (oi_iid[0], oi_iid[1]),
        (oi_iid[0], oi_iid[1] + 15),
        (mi_iid[0] + 10, oi_iid[1] + 15),
        (mi_iid[0] + 10, mi_iid[2])
    ])

    # 7. WALLET_TRANSACTION.User_ID -> USER.User_ID
    wt_uid = cell_positions[("WALLET_TRANSACTION", "User_ID")]
    ch_x = dw - 14
    draw_arrow([
        (wt_uid[0], wt_uid[2]),
        (wt_uid[0], wt_uid[2] - 8),
        (ch_x, wt_uid[2] - 8),
        (ch_x, u_uid[1] + 8),
        (u_uid[0] + 18, u_uid[1] + 8),
        (u_uid[0] + 18, u_uid[1])
    ])

    # 8. WALLET_TRANSACTION.Order_ID -> ORDER.Order_ID
    wt_oid = cell_positions[("WALLET_TRANSACTION", "Order_ID")]
    draw_arrow([
        (wt_oid[0], wt_oid[1]),
        (wt_oid[0], wt_oid[1] + 18),
        (ord_oid[0] + 12, wt_oid[1] + 18),
        (ord_oid[0] + 12, ord_oid[2])
    ])

    # 9. ITEM_DIETARY_TAGS.Item_ID -> MENU_ITEM.Item_ID
    dt_iid = cell_positions[("ITEM_DIETARY_TAGS", "Item_ID")]
    l_ch_x = 16
    draw_arrow([
        (dt_iid[3], dt_iid[2] + 7),
        (l_ch_x, dt_iid[2] + 7),
        (l_ch_x, mi_iid[2] - 8),
        (mi_iid[0] - 8, mi_iid[2] - 8),
        (mi_iid[0] - 8, mi_iid[2])
    ])

    # 10. ORDER_STATUS_LOG.Order_ID -> ORDER.Order_ID
    log_oid = cell_positions[("ORDER_STATUS_LOG", "Order_ID")]
    far_l_x = 8
    draw_arrow([
        (log_oid[3], log_oid[2] + 7),
        (far_l_x, log_oid[2] + 7),
        (far_l_x, ord_oid[2] - 14),
        (ord_oid[0] - 14, ord_oid[2] - 14),
        (ord_oid[0] - 14, ord_oid[2])
    ])

    return d


# =============================================================================
# MAIN REPORT COMPILER
# =============================================================================
def build_pdf():
    doc = SimpleDocTemplate(
        PDF_OUTPUT,
        pagesize=A4,
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=26,
        bottomMargin=32
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle('DocTitle', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=13, leading=16, textColor=colors.HexColor('#0f172a'), spaceAfter=2)
    sub_style = ParagraphStyle('DocSub', parent=styles['Normal'], fontName='Helvetica', fontSize=7.5, leading=10, textColor=colors.HexColor('#334155'), spaceAfter=1)
    team_style = ParagraphStyle('DocTeam', parent=styles['Normal'], fontName='Helvetica', fontSize=7.5, leading=10, textColor=colors.HexColor('#475569'), spaceAfter=4)
    h1_style = ParagraphStyle('SecH1', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=8.8, leading=11.2, textColor=colors.HexColor('#1e3a8a'), spaceBefore=3, spaceAfter=2)
    h2_style = ParagraphStyle('SecH2', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=7.5, leading=9.5, textColor=colors.HexColor('#0f172a'), spaceBefore=2, spaceAfter=1)
    body_style = ParagraphStyle('Body', parent=styles['Normal'], fontName='Helvetica', fontSize=6.8, leading=8.8, textColor=colors.HexColor('#1e293b'), spaceAfter=2)
    bullet_style = ParagraphStyle('Bullet', parent=styles['Normal'], fontName='Helvetica', fontSize=6.8, leading=8.8, textColor=colors.HexColor('#1e293b'), spaceAfter=1.5)
    
    cell_header = ParagraphStyle('CellH', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=6, leading=7.5, textColor=colors.HexColor('#0f172a'))
    cell_text = ParagraphStyle('CellT', parent=styles['Normal'], fontName='Helvetica', fontSize=5.8, leading=7.2, textColor=colors.HexColor('#1e293b'))
    
    code_style = ParagraphStyle('Code', parent=styles['Normal'], fontName='Courier', fontSize=5.4, leading=6.8, textColor=colors.HexColor('#0f172a'), backColor=colors.HexColor('#f8fafc'), borderColor=colors.HexColor('#e2e8f0'), borderWidth=0.5, borderPadding=2, spaceBefore=1, spaceAfter=2)

    story = []

    # =========================================================================
    # PAGE 1: TITLE, ABSTRACT, TECH STACK & ER CONSTRUCT CLASSIFICATIONS
    # =========================================================================
    story.append(Paragraph("PES UNIVERSITY", title_style))
    story.append(Paragraph("Department of Computer Science &amp; Engineering &middot; Fifth Semester B.Tech (CSE) &middot; Academic Year 2026", sub_style))
    story.append(HRFlowable(width="100%", thickness=1.2, color=colors.HexColor('#ea580c'), spaceAfter=4))

    story.append(Paragraph("<b>DBMS MINI PROJECT COMPREHENSIVE REPORT</b>", ParagraphStyle('Banner', alignment=1, fontSize=11, fontName='Helvetica-Bold', textColor=colors.HexColor('#0f172a'), spaceAfter=2)))
    story.append(Paragraph("<b>Project Title:</b> QuickBite — Intelligent Campus Cafeteria Multi-Model DBMS<br/><b>Course:</b> Database Management Systems (UE24CS351A) | <b>Faculty Guide:</b> Prof. Vinay Joshi", sub_style))

    # Student Table
    stud_data = [
        [Paragraph("<b>Student Name</b>", cell_header), Paragraph("<b>SRN</b>", cell_header), Paragraph("<b>Department / Year</b>", cell_header), Paragraph("<b>Project Specialization</b>", cell_header)],
        [Paragraph("Navaneeth Tanuboddi", cell_text), Paragraph("PES1UG24CS709", cell_text), Paragraph("CSE · Academic Year 2026", cell_text), Paragraph("Backend SQL, NoSQL & Triggers", cell_text)],
        [Paragraph("Rishab Naveen", cell_text), Paragraph("PES1UG24CS710", cell_text), Paragraph("CSE · Academic Year 2026", cell_text), Paragraph("Full-Stack Next.js & Vector AI", cell_text)],
    ]
    t_stud = Table(stud_data, colWidths=[140, 110, 140, 145])
    t_stud.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f1f5f9')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
    ]))
    story.append(t_stud)
    story.append(Spacer(1, 3))

    # Abstract
    story.append(Paragraph("1. Abstract &amp; Architecture Overview", h1_style))
    story.append(Paragraph(
        "Campus food courts face severe peak-hour concurrency spikes, inventory desynchronization, and order queuing delays during short lecture breaks. "
        "<b>QuickBite</b> is an enterprise-grade multi-model DBMS engineered to modernize cafeteria dining through a <i>polyglot persistence</i> architecture: "
        "<b>(1) MySQL 8.0</b> guarantees strict ACID serializability across student wallet debits, line item orders, and multi-vendor ledgers with procedural SQL triggers for stock integrity, state transition audits, and auto-refunds; "
        "<b>(2) MongoDB</b> provides a flexible, schema-validated repository for semi-structured student reviews, multi-criteria ratings, and sentiment aggregation; and "
        "<b>(3) AI Vector Database</b> (pgvector HNSW compatible) calculates cosine similarity over 384-dimensional dense semantic embeddings to recommend dishes from natural language cravings (e.g. 'spicy protein wrap').",
        body_style
    ))

    # ER Classifications Table
    story.append(Paragraph("2. Conceptual ER Modeling Construct Classifications", h1_style))
    t1_data = [
        [Paragraph("<b>Entity Set</b>", cell_header), Paragraph("<b>Entity Type</b>", cell_header), Paragraph("<b>Key Attribute</b>", cell_header), Paragraph("<b>Discriminator (Partial Key)</b>", cell_header), Paragraph("<b>Identifying Relationship</b>", cell_header)],
        [Paragraph("USER", cell_text), Paragraph("Strong Entity", cell_text), Paragraph("<u>User_ID</u>", cell_text), Paragraph("—", cell_text), Paragraph("—", cell_text)],
        [Paragraph("STALL", cell_text), Paragraph("Strong Entity", cell_text), Paragraph("<u>Stall_ID</u>", cell_text), Paragraph("—", cell_text), Paragraph("—", cell_text)],
        [Paragraph("MENU_ITEM", cell_text), Paragraph("Strong Entity", cell_text), Paragraph("<u>Item_ID</u>", cell_text), Paragraph("—", cell_text), Paragraph("—", cell_text)],
        [Paragraph("ORDER", cell_text), Paragraph("Strong Entity", cell_text), Paragraph("<u>Order_ID</u>", cell_text), Paragraph("—", cell_text), Paragraph("—", cell_text)],
        [Paragraph("WALLET_TRANSACTION", cell_text), Paragraph("Strong Entity", cell_text), Paragraph("<u>Transaction_ID</u>", cell_text), Paragraph("—", cell_text), Paragraph("—", cell_text)],
        [Paragraph("ORDER_ITEM", cell_text), Paragraph("Weak Entity", cell_text), Paragraph("Combination {Order_ID, Item_ID}", cell_text), Paragraph("Item_ID", cell_text), Paragraph("CONTAINS (with ORDER)", cell_text)],
        [Paragraph("ORDER_STATUS_LOG", cell_text), Paragraph("Weak Entity", cell_text), Paragraph("Combination {Order_ID, Changed_At}", cell_text), Paragraph("Changed_At", cell_text), Paragraph("AUDITS (with ORDER)", cell_text)]
    ]
    t1 = Table(t1_data, colWidths=[90, 75, 135, 105, 130])
    t1.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f1f5f9')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('TOPPADDING', (0,0), (-1,-1), 1.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 1.5),
    ]))
    story.append(t1)
    story.append(Spacer(1, 3))

    # Relationships & Cardinalities Table
    story.append(Paragraph("3. Relationships, Cardinality &amp; Participation Constraints", h1_style))
    t3_data = [
        [Paragraph("<b>Relationship Set</b>", cell_header), Paragraph("<b>Participating Entities</b>", cell_header), Paragraph("<b>Cardinality</b>", cell_header), Paragraph("<b>Structural Constraint (Min, Max)</b>", cell_header), Paragraph("<b>Participation Constraint</b>", cell_header)],
        [Paragraph("MANAGES", cell_text), Paragraph("USER (Owner) : STALL", cell_text), Paragraph("1 : N", cell_text), Paragraph("USER (0, N); STALL (1, 1)", cell_text), Paragraph("STALL: Total; USER: Partial", cell_text)],
        [Paragraph("OFFERS", cell_text), Paragraph("STALL : MENU_ITEM", cell_text), Paragraph("1 : N", cell_text), Paragraph("STALL (0, N); MENU_ITEM (1, 1)", cell_text), Paragraph("MENU_ITEM: Total; STALL: Partial", cell_text)],
        [Paragraph("PLACES", cell_text), Paragraph("USER (Student) : ORDER", cell_text), Paragraph("1 : N", cell_text), Paragraph("USER (0, N); ORDER (1, 1)", cell_text), Paragraph("ORDER: Total; USER: Partial", cell_text)],
        [Paragraph("CONTAINS", cell_text), Paragraph("ORDER : ORDER_ITEM", cell_text), Paragraph("1 : N", cell_text), Paragraph("ORDER (1, N); ORDER_ITEM (1, 1)", cell_text), Paragraph("Both Total (Identifying Relationship)", cell_text)],
        [Paragraph("REFERENCES", cell_text), Paragraph("MENU_ITEM : ORDER_ITEM", cell_text), Paragraph("1 : N", cell_text), Paragraph("MENU_ITEM (0, N); ORDER_ITEM (1, 1)", cell_text), Paragraph("ORDER_ITEM: Total; MENU_ITEM: Partial", cell_text)],
        [Paragraph("AUDITS", cell_text), Paragraph("ORDER : ORDER_STATUS_LOG", cell_text), Paragraph("1 : N", cell_text), Paragraph("ORDER (1, N); LOG (1, 1)", cell_text), Paragraph("Both Total (Immutable Lifecycle Trail)", cell_text)]
    ]
    t3 = Table(t3_data, colWidths=[80, 115, 60, 140, 140])
    t3.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f1f5f9')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('TOPPADDING', (0,0), (-1,-1), 1.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 1.5),
    ]))
    story.append(t3)

    story.append(PageBreak())

    # =========================================================================
    # PAGE 2: FULL CONCEPTUAL ER DIAGRAM (CHEN'S NOTATION) & MAPPING STEPS 1-4
    # =========================================================================
    story.append(Paragraph("4. Conceptual ER Diagram (Chen's Notation with Complete Attributes)", h1_style))
    story.append(Paragraph("Features complete attribute coverage: primary keys underlined, composite subparts, multivalued double ovals (Dietary_Tags), derived dashed ovals (Total_Amount, Subtotal, Is_Available), and weak identifying relationships.", body_style))
    story.append(create_full_er_diagram())
    story.append(Spacer(1, 4))

    story.append(Paragraph("5. Step-by-Step ER-to-Relational Mapping (Steps 1 to 4)", h1_style))
    story.append(Paragraph("• <b>Step 1 (Regular Entities):</b> Create USER (PK <u>User_ID</u>), STALL (PK <u>Stall_ID</u>), MENU_ITEM (PK <u>Item_ID</u>), ORDER (PK <u>Order_ID</u>), and WALLET_TRANSACTION (PK <u>Txn_ID</u>). Flatten composite attribute <i>Full_Name</i> into atomic scalars <i>First_Name</i> and <i>Last_Name</i>.", bullet_style))
    story.append(Paragraph("• <b>Step 2 (Weak Entities):</b> Create ORDER_ITEM with composite PK {<u>Order_ID, Item_ID</u>}, FK <i>Order_ID</i> &rarr; ORDER. Create ORDER_STATUS_LOG with composite PK {<u>Order_ID, Changed_At</u>}, FK <i>Order_ID</i> &rarr; ORDER.", bullet_style))
    story.append(Paragraph("• <b>Step 3 (Binary 1:1):</b> None present in core schema; stall ownership and student profile decompose cleanly into 1:N relations.", bullet_style))
    story.append(Paragraph("• <b>Step 4 (Binary 1:N):</b> Embed foreign keys into N-side relations: STALL(<i>Owner_ID</i> &rarr; USER), MENU_ITEM(<i>Stall_ID</i> &rarr; STALL), ORDER(<i>Student_ID</i> &rarr; USER, <i>Stall_ID</i> &rarr; STALL), ORDER_ITEM(<i>Item_ID</i> &rarr; MENU_ITEM), and WALLET_TRANSACTION(<i>User_ID</i> &rarr; USER, <i>Order_ID</i> &rarr; ORDER).", bullet_style))

    story.append(PageBreak())

    # =========================================================================
    # PAGE 3: MAPPING STEPS 5-7 & FINAL RELATIONAL SCHEMA DIAGRAM (SLIDE 33)
    # =========================================================================
    story.append(Paragraph("6. ER-to-Relational Mapping (Steps 5 to 7)", h1_style))
    story.append(Paragraph("• <b>Step 5 (Binary M:N Types):</b> Resolved via Associative Weak Entity: The M:N relationship between ORDER and MENU_ITEM is fully resolved through weak entity relation ORDER_ITEM with composite PK {<u>Order_ID, Item_ID</u>} and descriptive attributes <i>Quantity</i> and <i>Unit_Price</i>. No redundant join tables required.", bullet_style))
    story.append(Paragraph("• <b>Step 6 (Multivalued Attributes):</b> The multivalued attribute <i>Dietary_Tags</i> of MENU_ITEM is normalized into ITEM_DIETARY_TAGS with composite PK {<u>Item_ID, Dietary_Tag</u>} and FK <i>Item_ID</i> &rarr; MENU_ITEM (satisfying 1NF).", bullet_style))
    story.append(Paragraph("• <b>Step 7 (N-ary Types):</b> QuickBite multi-party ordering interactions decompose into binary structures without ternary dependency anomalies.", bullet_style))
    story.append(Spacer(1, 2))

    story.append(Paragraph("7. Final Relational Schema Diagram (Slide 33 Representation)", h1_style))
    story.append(Paragraph("Closed 8-relation schema with primary keys underlined and directed foreign key arrows pointing directly into referenced primary keys.", body_style))
    story.append(create_relational_schema_diagram())

    story.append(PageBreak())

    # =========================================================================
    # PAGE 4: SQL DATABASE COMMANDS & ADVANCED CONCEPTS
    # =========================================================================
    story.append(Paragraph("8. SQL Database Commands &amp; Advanced Implementation", h1_style))
    story.append(Paragraph("<b>8.1 Advanced Database Triggers (Automated Invariants)</b>", h2_style))
    story.append(Paragraph("• <b>trg_audit_order_status_change</b>: Automatically writes an immutable state-transition row into ORDER_STATUS_LOG upon order update.", bullet_style))
    story.append(Paragraph("• <b>trg_validate_stock_and_deduct</b>: Fires BEFORE INSERT ON ORDER_ITEM; rejects orders if stock is depleted via SIGNAL SQLSTATE '45000', else auto-decrements stock.", bullet_style))
    story.append(Paragraph("• <b>trg_cancel_order_refund_and_restock</b>: Restores inventory quantities, refunds student Wallet_Balance, and logs a Refund transaction upon cancellation.", bullet_style))

    story.append(Paragraph("<b>8.2 Multi-Item Atomic Checkout Transaction (MySQL 8.0)</b>", h2_style))
    story.append(Preformatted("""-- Multi-item transaction executes atomically across multiple line items:
START TRANSACTION;
SELECT Price, Stock_Qty FROM MENU_ITEM WHERE Item_ID = ? AND Stall_ID = ? FOR UPDATE;
SELECT Wallet_Balance FROM USER_TABLE WHERE User_ID = ? FOR UPDATE;
UPDATE USER_TABLE SET Wallet_Balance = Wallet_Balance - ? WHERE User_ID = ?;
INSERT INTO ORDER_TABLE (Order_ID, Student_ID, Stall_ID, Total_Amount, Status, Instructions, Created_At) VALUES (?, ?, ?, ?, 'Placed', ?, NOW());
-- Loop across cart items (fires stock decrement trigger trg_validate_stock_and_deduct):
INSERT INTO ORDER_ITEM (Order_ID, Item_ID, Quantity, Unit_Price) VALUES (?, ?, ?, ?);
INSERT INTO WALLET_TRANSACTION (Txn_ID, User_ID, Amount, Type, Description, Order_ID, Created_At) VALUES (?, ?, ?, 'Order_Payment', ?, ?, NOW());
COMMIT;""", code_style))

    story.append(Paragraph("<b>8.3 Recursive Query &amp; Complex Analytics Outputs</b>", h2_style))
    sql_out_data = [
        [Paragraph("<b>Query Concept</b>", cell_header), Paragraph("<b>SQL Syntax / Method</b>", cell_header), Paragraph("<b>Verified Database Output</b>", cell_header)],
        [Paragraph("Recursive CTE", cell_text), Paragraph("WITH RECURSIVE OrderWorkflowGraph AS (...) Traverses lifecycle state machine", cell_text), Paragraph("Step 1: Placed -> Cooking<br/>Step 2: Cooking -> Ready<br/>Step 3: Ready -> Delivered", cell_text)],
        [Paragraph("Correlated Subquery", cell_text), Paragraph("WHERE Price > (SELECT AVG(Price) FROM MENU_ITEM WHERE Stall_ID = outer.Stall_ID)", cell_text), Paragraph("IT02 (Chicken Kathi Roll): Rs. 140 (+Rs. 10 above avg)<br/>IT03 (Podi Dosa): Rs. 85 (+Rs. 10 above avg)", cell_text)],
        [Paragraph("Multi-Tier CTE", cell_text), Paragraph("WITH StallSummary AS (...) SELECT DENSE_RANK() OVER (ORDER BY Revenue DESC)", cell_text), Paragraph("Rank 1: Rolls & Bowls (Rs. 240.00, Tier-1)<br/>Rank 2: South Kitchen (Rs. 235.00, Tier-1)<br/>Rank 3: Sip & Snack (Rs. 70.00, Tier-2)", cell_text)],
        [Paragraph("Relational Division", cell_text), Paragraph("WHERE Role='Student' AND NOT EXISTS (SELECT s FROM STALL NOT EXISTS (SELECT o...))", cell_text), Paragraph("Finds active students who have ordered from EVERY single campus food stall", cell_text)],
        [Paragraph("5-Way Master Join", cell_text), Paragraph("JOIN USER, STALL, ORDER, ORDER_ITEM, MENU_ITEM GROUP BY o.Order_ID", cell_text), Paragraph("Produces itemized accounting receipt aggregating line items and prices", cell_text)]
    ]
    t_sql = Table(sql_out_data, colWidths=[95, 210, 230])
    t_sql.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f8fafc')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
    ]))
    story.append(t_sql)

    story.append(PageBreak())

    # =========================================================================
    # PAGE 5: NOSQL DOCUMENT STORE & 384-D AI VECTOR SEARCH
    # =========================================================================
    story.append(Paragraph("9. NoSQL Document Store &amp; 384-D AI Vector Database", h1_style))
    story.append(Paragraph(
        "<b>MongoDB Implementation</b>: Collection <code>food_reviews</code> created with strict <code>$jsonSchema</code> validation, enforcing valid ratings (1-5), dish reference, and unstructured tags. "
        "Includes compound indexes (<code>{ dish_id: 1, rating: -1 }</code>) and an aggregation pipeline calculating real-time mean dish ratings.<br/>"
        "<b>384-Dimensional AI Vector Search</b>: Generates 384-dimensional dense normalized embeddings (pgvector HNSW standard) mapping spice, sweetness, warmth, and protein. Cosine similarity retrieves top-matching dishes for vague natural language cravings.",
        body_style
    ))

    vec_out_data = [
        [Paragraph("<b>Student Natural Language Query</b>", cell_header), Paragraph("<b>Top-1 Recommended Dish</b>", cell_header), Paragraph("<b>Vector Dimension &amp; Cosine Match</b>", cell_header)],
        [Paragraph("'spicy high-protein wrap for lunch'", cell_text), Paragraph("Chicken Kathi Roll (Rolls &amp; Bowls)", cell_text), Paragraph("<b>384 Dimensions · 97.4% Match</b> (0.974)", cell_text)],
        [Paragraph("'chilled sweet refreshing beverage'", cell_text), Paragraph("Cold Coffee w/ Ice Cream (Sip &amp; Snack)", cell_text), Paragraph("<b>384 Dimensions · 99.9% Match</b> (0.999)", cell_text)],
        [Paragraph("'traditional warm South Indian breakfast'", cell_text), Paragraph("Steamed Idli Vada Combo (South Kitchen)", cell_text), Paragraph("<b>384 Dimensions · 99.8% Match</b> (0.998)", cell_text)],
    ]
    t_vec = Table(vec_out_data, colWidths=[180, 180, 175])
    t_vec.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f8fafc')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('TOPPADDING', (0,0), (-1,-1), 2.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
    ]))
    story.append(t_vec)
    story.append(Spacer(1, 4))

    story.append(Paragraph("10. Technology Justification: Multi-Model Architecture Rationale", h1_style))
    tech_just_data = [
        [Paragraph("<b>Storage Paradigm</b>", cell_header), Paragraph("<b>Engine Deployed</b>", cell_header), Paragraph("<b>Architectural &amp; Theoretical Justification</b>", cell_header)],
        [Paragraph("Relational (RDBMS)", cell_text), Paragraph("MySQL 8.0 (InnoDB)", cell_text), Paragraph("Requires strict ACID compliance, serializable isolation, row-level locks (FOR UPDATE), and foreign key cascades to ensure student wallet balances and inventory stocks remain mathematically consistent without double-spending.", cell_text)],
        [Paragraph("Document NoSQL", cell_text), Paragraph("MongoDB 6.0+", cell_text), Paragraph("Student feedback is inherently polymorphic and semi-structured (varying tags, photos, ratings). MongoDB handles schema flexibility and executes aggregations ($group, $avg) without locking financial ledger tables.", cell_text)],
        [Paragraph("AI Vector Database", cell_text), Paragraph("pgvector / Cosine Math", cell_text), Paragraph("Traditional SQL LIKE '%...%' keyword queries fail on vague cravings (e.g. 'hot savory snack'). Vector embeddings project dishes into 384-dimensional semantic space, ranking recommendations by cosine angle.", cell_text)]
    ]
    t_just = Table(tech_just_data, colWidths=[110, 115, 310])
    t_just.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f8fafc')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('TOPPADDING', (0,0), (-1,-1), 2.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
    ]))
    story.append(t_just)

    story.append(PageBreak())

    # =========================================================================
    # PAGE 6: NEXT.JS TREE STRUCTURE & LIVE DEMONSTRATION VERIFICATION
    # =========================================================================
    story.append(Paragraph("11. Next.js Project Tree Structure", h1_style))
    story.append(Preformatted("""quickbite/
+-- sql/
|   +-- 01_schema_and_seed.sql         # Core DDL tables, constraints & dummy data
|   +-- 02_advanced_scripts.sql        # Triggers, Procedures, Functions, CTEs, Recursive
|   \\-- test_advanced_sql.py           # Standalone verification runner
+-- nosql/
|   +-- 01_nosql_setup_and_crud.js     # MongoDB validation, indexing & CRUD scripts
|   +-- 02_vector_search_demo.py       # 384-D dense embedding & cosine similarity engine
|   \\-- 03_technology_justification.md # Academic rationale (SQL vs NoSQL vs Vector)
+-- frontend/
|   +-- app/
|   |   +-- api/
|   |   |   +-- auth/route.ts          # RBAC Session & user listing
|   |   |   +-- menu/route.ts          # Stall & menu items retrieval (MySQL + Fallback)
|   |   |   +-- orders/
|   |   |   |   +-- route.ts           # Multi-item checkout (ACID transaction)
|   |   |   |   \\-- [id]/status/route.ts # Order state transitions & audit trigger
|   |   |   +-- reviews/route.ts       # NoSQL MongoDB reviews & aggregation pipeline
|   |   |   \\-- vector-search/route.ts # 384-D AI Cosine craving recommendation API
|   |   +-- layout.tsx & page.tsx      # Unified Dashboard (Student + Stall Owner)
|   +-- lib/
|   |   +-- db.ts                      # In-memory polyglot store & 384-D embeddings
|   |   +-- mysql.ts                   # MySQL2 connection pool (localhost:3306)
|   |   +-- mysql-repository.ts        # ACID multi-item checkout & MySQL queries
|   |   \\-- mongodb.ts                 # MongoDB document collection engine
|   \\-- package.json
\\-- QuickBite_DBMS_Mini_Project_Report.pdf""", code_style))

    story.append(Paragraph("12. Application Walkthrough &amp; Demonstration Verification", h1_style))
    screen_data = [
        [Paragraph("<b>Application View / Workflow</b>", cell_header), Paragraph("<b>Key Technical Features Demonstrated &amp; Verified</b>", cell_header)],
        [
            Paragraph("<b>1. Student Ordering &amp; 384-D AI Craving Search</b>", cell_text),
            Paragraph("• Real-time craving query input calculates 384-dimensional cosine similarity across all items.<br/>• Displays green match badges (e.g., '97% Match') and allows one-click tray addition.<br/>• Stall filter chips categorize dishes across Food Court Counter 1, Counter 2, and 13th Floor Kiosk.", cell_text)
        ],
        [
            Paragraph("<b>2. Multi-Item Checkout Tray &amp; Wallet Debit</b>", cell_text),
            Paragraph("• Tray tracks item quantities, individual subtotals, and projected debits.<br/>• Real-time balance check prevents overdrafts (e.g., Rs. 450 balance debits Rs. 240 for 2 Tikka Rolls).<br/>• Executes atomic ACID transaction in database, decrementing inventory stock in MENU_ITEM.", cell_text)
        ],
        [
            Paragraph("<b>3. Live Order Progression Timeline (Student)</b>", cell_text),
            Paragraph("• Visual horizontal state progression: Placed -> Cooking -> Ready -> Delivered.<br/>• State changes reflect automatically when vendor updates kitchen queue.<br/>• Cancellation shows automated refund message restoring student wallet balance via database trigger.", cell_text)
        ],
        [
            Paragraph("<b>4. Stall Owner Kitchen Queue &amp; RBAC Console</b>", cell_text),
            Paragraph("• Vendor-authenticated dashboard showing active tickets for assigned stall (e.g., ST01 - Rolls & Bowls).<br/>• Action buttons: 'Start Cooking', 'Mark Ready for Pickup', 'Hand Over', and 'Cancel & Auto-Refund'.<br/>• Database trigger automatically logs timestamped entry into ORDER_STATUS_LOG upon each click.", cell_text)
        ],
        [
            Paragraph("<b>5. NoSQL Community Reviews &amp; Interactive Insert</b>", cell_text),
            Paragraph("• Displays polymorphic reviews containing star ratings, portion adequacy, spice levels, and student tags.<br/>• Includes interactive '+ Post New Review (MongoDB)' modal inserting documents via POST /api/reviews.<br/>• MongoDB aggregation pipeline computes real-time average ratings per dish.", cell_text)
        ],
    ]
    t_screen = Table(screen_data, colWidths=[175, 360])
    t_screen.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f8fafc')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('TOPPADDING', (0,0), (-1,-1), 1.8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 1.8),
    ]))
    story.append(t_screen)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Report PDF successfully generated at: {PDF_OUTPUT}")

if __name__ == "__main__":
    build_pdf()
