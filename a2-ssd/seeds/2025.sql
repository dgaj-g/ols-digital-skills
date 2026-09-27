-- seeds/2025.sql — The Stables (CCEA A2 SSD 2025). SQLite dialect. Dates are relative to today.
-- CUSTOMER and INSTRUCTOR are the paper's assumed tables. LESSON rows 1 and 2 are the paper's printed sample rows.
-- Lesson slot 15 is the group hack; instructors 18 and 27 exist and are not yet linked to it (for 2025-a-ii).
-- 2025-b: bookings 7 to 13 days from today for four instructors; traps: bookings this week and in two weeks' time.
-- BOOKINGS (the mark scheme's spelling) is a view of BOOKING, so either name runs.
PRAGMA foreign_keys = ON;
CREATE TABLE CUSTOMER (CustomerID INTEGER PRIMARY KEY, CustomerForename TEXT COLLATE NOCASE, CustomerSurname TEXT COLLATE NOCASE);
CREATE TABLE INSTRUCTOR (InstructorID INTEGER PRIMARY KEY, Forename TEXT COLLATE NOCASE, Surname TEXT COLLATE NOCASE);
CREATE TABLE AREA (AreaID INTEGER PRIMARY KEY, AreaName TEXT COLLATE NOCASE, AreaType TEXT COLLATE NOCASE);
CREATE TABLE LESSON (LessonID INTEGER PRIMARY KEY, LessonName TEXT COLLATE NOCASE, Level TEXT COLLATE NOCASE, Duration INTEGER, LessonType TEXT COLLATE NOCASE, LessonFormat TEXT COLLATE NOCASE);
CREATE TABLE LESSONSLOT (LessonslotID INTEGER PRIMARY KEY, DayOfWeek TEXT COLLATE NOCASE, StartTime TEXT, EndTime TEXT, LessonID INTEGER REFERENCES LESSON, AreaID INTEGER REFERENCES AREA);
CREATE TABLE LSLOT_INSTRUCT (LessonslotID INTEGER REFERENCES LESSONSLOT, InstructorID INTEGER REFERENCES INSTRUCTOR, PRIMARY KEY (LessonslotID, InstructorID));
CREATE TABLE BOOKING (BookingID INTEGER PRIMARY KEY, LessonslotID INTEGER REFERENCES LESSONSLOT, CustomerID INTEGER REFERENCES CUSTOMER, NumLessons INTEGER, BookingDate DATE, HealthIssues TEXT COLLATE NOCASE);
CREATE VIEW BOOKINGS AS SELECT * FROM BOOKING;
INSERT INTO CUSTOMER VALUES
 (1,'Ailbhe','Coyle'),(2,'Ben','Dunne'),(3,'Chloe','Early'),(4,'Daniel','Fearon'),(5,'Erin','Geddis'),
 (6,'Finn','Heaney'),(7,'Grace','Ivers'),(8,'Hannah','Joyce'),(9,'Isaac','Keown'),(10,'Jade','Lamph');
INSERT INTO INSTRUCTOR VALUES
 (11,'Mark','Armstrong'),(14,'Diane','Armstrong'),(18,'Kerry','Boylan'),(21,'Niamh','Cunningham'),(27,'Ruairi','Dempsey'),(30,'Sarah','Elliott');
INSERT INTO AREA VALUES (1,'Large Paddock','P'),(2,'Small Paddock','P'),(3,'Indoor Arena','A'),(4,'Forest Trail','T');
INSERT INTO LESSON VALUES
 (1,'BRiding30','B',30,'R','I'),
 (2,'BRidingG30','B',30,'R','G'),
 (3,'IRiding45','I',45,'R','I'),
 (4,'IJumping60','I',60,'J','G'),
 (5,'AJumping60','A',60,'J','I'),
 (6,'Hack90','I',90,'H','G');
INSERT INTO LESSONSLOT VALUES
 (1,'Monday','10:00','10:30',2,1),
 (2,'Monday','10:30','11:00',2,1),
 (3,'Tuesday','16:00','16:30',1,2),
 (4,'Tuesday','17:00','17:45',3,3),
 (5,'Wednesday','16:00','17:00',4,3),
 (6,'Thursday','17:00','18:00',5,3),
 (7,'Friday','16:30','17:00',1,2),
 (8,'Saturday','10:00','10:45',3,3),
 (9,'Saturday','11:00','12:00',4,1),
 (15,'Sunday','10:00','11:30',6,4);
INSERT INTO LSLOT_INSTRUCT VALUES (1,11),(2,11),(3,14),(4,21),(5,14),(5,30),(6,30),(7,18),(8,21),(9,27);
INSERT INTO BOOKING VALUES
 (1,1,1,1,date('now','+7 days'),NULL),
 (2,3,2,4,date('now','+8 days'),'Asthma'),
 (3,4,3,1,date('now','+8 days'),NULL),
 (4,5,4,1,date('now','+9 days'),NULL),
 (5,6,5,6,date('now','+10 days'),NULL),
 (6,8,6,1,date('now','+11 days'),'Mild hip pain'),
 (7,2,7,1,date('now','+7 days'),NULL),
 (8,5,8,1,date('now','+12 days'),NULL),
 (9,4,9,4,date('now','+13 days'),NULL),
 (10,1,10,1,date('now','+2 days'),NULL),
 (11,7,2,1,date('now','+3 days'),NULL),
 (12,9,3,1,date('now','+15 days'),NULL),
 (13,6,5,6,date('now','+17 days'),NULL),
 (14,3,1,1,date('now','-4 days'),NULL);
