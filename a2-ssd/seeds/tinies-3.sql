-- seeds/tinies-3.sql — Tinies question set 3 (child attendance and absences). SQLite dialect. Dates are relative to today.
-- Three newly registered children (C-055, C-056, C-058) have no attendance record at all.
-- This calendar month: C-047 has four unnotified absences and C-044 three; traps: C-046 two unnotified and two notified,
-- C-049 three unnotified last month, C-050 three unnotified in this month last year. The day has four session slots, so
-- early in a month (when this month's absences fall on one day) no child is ever absent twice from the same session.
-- C-052's absence on 22/04/2026 is still recorded as unexplained; C-041's attendance on 21/04/2026 is not recorded yet.
-- Contracts K-112 (four months ago) and K-113 (20 days ago) have no child linked yet: the LEFT JOIN lesson. K-111 is T-INSERT-1's.
-- The NULL-OR lesson: C-053 (yesterday) and C-050 (15 days ago) have a register not marked yet (AttendedYN NULL);
-- C-041 was off sick 4 days ago (listed) and C-042 12 days ago (a trap: more than seven days).
-- The JOIN-TODAY lesson: C-041, C-052 and C-053 attend today; yesterday C-052 (Holiday) and C-049 (Appointment) were absent,
-- both notified with a reason, so no count of unnotified or unexplained absences changes.
PRAGMA foreign_keys = ON;
CREATE TABLE CONTRACT (ContractID TEXT COLLATE NOCASE PRIMARY KEY, ContractStartDate DATE, ContractType TEXT COLLATE NOCASE, MonthlySessions INTEGER, ParentID TEXT COLLATE NOCASE);
CREATE TABLE CHILD (ChildID TEXT COLLATE NOCASE PRIMARY KEY, ChildFName TEXT COLLATE NOCASE, ChildSName TEXT COLLATE NOCASE, AgeGroup TEXT COLLATE NOCASE, ContractID TEXT COLLATE NOCASE REFERENCES CONTRACT);
CREATE TABLE ATTENDANCE (AttendanceID INTEGER PRIMARY KEY AUTOINCREMENT, ChildID TEXT COLLATE NOCASE REFERENCES CHILD, AttendanceDate DATE, SessionSlot INTEGER, AttendedYN TEXT COLLATE NOCASE, AbsenceReason TEXT COLLATE NOCASE, NotifiedYN TEXT COLLATE NOCASE);
INSERT INTO CONTRACT VALUES
 ('K-101','2025-09-01','Full-time',40,'P-001'),
 ('K-102','2025-09-01','Part-time',20,'P-002'),
 ('K-103','2025-10-06','Full-time',40,'P-003'),
 ('K-104','2026-01-05','Flexible',12,'P-004'),
 ('K-105','2026-01-05','Part-time',20,'P-005'),
 ('K-106','2026-02-02','Full-time',40,'P-006'),
 ('K-107','2026-03-02','Part-time',16,'P-007'),
 ('K-108','2026-04-06','Flexible',8,'P-008'),
 ('K-109',date('now','-12 days'),'Part-time',20,'P-009'),
 ('K-110',date('now','-5 days'),'Full-time',40,'P-010'),
 ('K-112',date('now','start of month','-4 months','+3 days'),'Part-time',20,'P-012'),
 ('K-113',date('now','-20 days'),'Full-time',40,'P-013');
INSERT INTO CHILD VALUES
 ('C-041','Niamh','Murphy','Toddler','K-101'),
 ('C-042','Sean','Boyle','Preschool','K-102'),
 ('C-044','Freya','Quinn','Toddler','K-103'),
 ('C-046','Ruairi','Coyle','Preschool','K-104'),
 ('C-047','Eabha','Rice','Toddler','K-105'),
 ('C-049','Clodagh','Watters','Baby','K-106'),
 ('C-050','Fionn','Doran','Preschool','K-107'),
 ('C-052','Aisling','Grant','Toddler','K-108'),
 ('C-053','Liam','Hollywood','Baby','K-106'),
 ('C-055','Maria','Kane','Baby','K-109'),
 ('C-056','Patrick','Kane','Toddler','K-109'),
 ('C-058','Roisin','Lavery','Preschool','K-110');
INSERT INTO ATTENDANCE (ChildID, AttendanceDate, SessionSlot, AttendedYN, AbsenceReason, NotifiedYN) VALUES
 ('C-052','2026-04-22',1,'N',NULL,'N'),
 ('C-041','2026-04-20',2,'Y',NULL,NULL),
 ('C-041','2026-04-22',2,'Y',NULL,NULL),
 ('C-041',date('now','start of month','-1 month','+3 days'),1,'Y',NULL,NULL),
 ('C-041',max(date('now','-1 days'),date('now','start of month')),1,'Y',NULL,NULL),
 ('C-042',date('now','start of month','-1 month','+4 days'),3,'Y',NULL,NULL),
 ('C-042',max(date('now','-2 days'),date('now','start of month')),3,'N','Dentist','Y'),
 ('C-053',date('now','start of month','-1 month','+10 days'),2,'Y',NULL,NULL),
 ('C-053',max(date('now','-3 days'),date('now','start of month')),2,'Y',NULL,NULL),
 ('C-047',date('now'),4,'N',NULL,'N'),
 ('C-047',max(date('now','-1 days'),date('now','start of month')),3,'N',NULL,'N'),
 ('C-047',max(date('now','-2 days'),date('now','start of month')),2,'N',NULL,'N'),
 ('C-047',max(date('now','-3 days'),date('now','start of month')),1,'N',NULL,'N'),
 ('C-047',max(date('now','-6 days'),date('now','start of month')),4,'Y',NULL,NULL),
 ('C-044',max(date('now','-5 days'),date('now','start of month')),1,'N',NULL,'N'),
 ('C-044',max(date('now','-6 days'),date('now','start of month')),2,'N',NULL,'N'),
 ('C-044',max(date('now','-7 days'),date('now','start of month')),3,'N',NULL,'N'),
 ('C-044',max(date('now','-2 days'),date('now','start of month')),4,'Y',NULL,NULL),
 ('C-046',max(date('now','-1 days'),date('now','start of month')),1,'N',NULL,'N'),
 ('C-046',max(date('now','-4 days'),date('now','start of month')),2,'N',NULL,'N'),
 ('C-046',max(date('now','-2 days'),date('now','start of month')),3,'N','Sickness','Y'),
 ('C-046',max(date('now','-8 days'),date('now','start of month')),4,'N','Holiday','Y'),
 ('C-049',date('now','start of month','-5 days'),1,'N',NULL,'N'),
 ('C-049',date('now','start of month','-6 days'),2,'N',NULL,'N'),
 ('C-049',date('now','start of month','-7 days'),3,'N',NULL,'N'),
 ('C-050',date('now','start of month','-1 year','+2 days'),1,'N',NULL,'N'),
 ('C-050',date('now','start of month','-1 year','+3 days'),2,'N',NULL,'N'),
 ('C-050',date('now','start of month','-1 year','+4 days'),3,'N',NULL,'N'),
 ('C-050',max(date('now','-1 days'),date('now','start of month')),2,'Y',NULL,NULL),
 ('C-053',date('now','-1 days'),1,NULL,NULL,NULL),
 ('C-050',date('now','-15 days'),4,NULL,NULL,NULL),
 ('C-041',date('now','-4 days'),2,'N','Sickness','Y'),
 ('C-042',date('now','-12 days'),1,'N','Sickness','Y'),
 ('C-041',date('now'),3,'Y',NULL,NULL),
 ('C-052',date('now'),2,'Y',NULL,NULL),
 ('C-053',date('now'),1,'Y',NULL,NULL),
 ('C-052',date('now','-1 days'),3,'N','Holiday','Y'),
 ('C-049',date('now','-1 days'),2,'N','Appointment','Y');
