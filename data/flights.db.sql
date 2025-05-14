CREATE TABLE IF NOT EXISTS "airline" (
	"id"	TEXT,
	"name"	TEXT NOT NULL,
	"website_link"	TEXT,
	PRIMARY KEY("id")
);
CREATE TABLE IF NOT EXISTS "airport" (
	"id"	TEXT,
	"city"	TEXT NOT NULL,
	"country"	TEXT NOT NULL,
	PRIMARY KEY("id")
);
CREATE TABLE IF NOT EXISTS "flight" (
	"id"	TEXT,
	"airline_id"	TEXT NOT NULL,
	"airport_depart_id"	TEXT NOT NULL,
	"airport_arrive_id"	TEXT NOT NULL,
	"time_departure"	TEXT NOT NULL,
	"time_arrival"	TEXT NOT NULL,
	"num_tickets"	INTEGER NOT NULL CHECK("num_tickets" >= 0),
	PRIMARY KEY("id"),
	FOREIGN KEY("airline_id") REFERENCES "airline"("id") ON UPDATE RESTRICT ON DELETE RESTRICT,
	FOREIGN KEY("airport_arrive_id") REFERENCES "airport"("id") ON UPDATE RESTRICT ON DELETE RESTRICT,
	FOREIGN KEY("airport_depart_id") REFERENCES "airport"("id") ON UPDATE RESTRICT ON DELETE RESTRICT
);
CREATE TABLE IF NOT EXISTS "hearts" (
	"ticket_code"	TEXT NOT NULL,
	"flight_id"	TEXT NOT NULL,
	"airline_id"	TEXT NOT NULL,
	"user_id"	TEXT NOT NULL,
	PRIMARY KEY("ticket_code","flight_id","airline_id","user_id"),
	FOREIGN KEY("ticket_code","flight_id","airline_id") REFERENCES "ticket"("code","flight_id","airline_id") ON UPDATE RESTRICT ON DELETE RESTRICT,
	FOREIGN KEY("user_id") REFERENCES "user"("id") ON UPDATE RESTRICT ON DELETE RESTRICT
);
CREATE TABLE IF NOT EXISTS "ticket" (
	"code"	TEXT,
	"flight_id"	TEXT NOT NULL,
	"airline_id"	TEXT NOT NULL,
	"class"	TEXT NOT NULL,
	"price"	REAL NOT NULL CHECK("price" >= 0),
	"availability"	INTEGER NOT NULL CHECK("availability" >= 0),
	PRIMARY KEY("code","flight_id","airline_id"),
	FOREIGN KEY("airline_id") REFERENCES "airline"("id") ON UPDATE RESTRICT ON DELETE RESTRICT,
	FOREIGN KEY("flight_id") REFERENCES "flight"("id") ON UPDATE RESTRICT ON DELETE RESTRICT
);
CREATE TABLE IF NOT EXISTS "user" (
	"id"	TEXT,
	"password"	TEXT NOT NULL,
	PRIMARY KEY("id")
);CREATE TABLE IF NOT EXISTS "airline" (
	"id"	TEXT,
	"name"	TEXT NOT NULL,
	"website_link"	TEXT,
	PRIMARY KEY("id")
);
CREATE TABLE IF NOT EXISTS "airport" (
	"id"	TEXT,
	"city"	TEXT NOT NULL,
	"country"	TEXT NOT NULL,
	PRIMARY KEY("id")
);
CREATE TABLE IF NOT EXISTS "flight" (
	"id"	TEXT,
	"airline_id"	TEXT NOT NULL,
	"airport_depart_id"	TEXT NOT NULL,
	"airport_arrive_id"	TEXT NOT NULL,
	"time_departure"	TEXT NOT NULL,
	"time_arrival"	TEXT NOT NULL,
	"num_tickets"	INTEGER NOT NULL CHECK("num_tickets" >= 0),
	PRIMARY KEY("id"),
	FOREIGN KEY("airline_id") REFERENCES "airline"("id") ON UPDATE RESTRICT ON DELETE RESTRICT,
	FOREIGN KEY("airport_arrive_id") REFERENCES "airport"("id") ON UPDATE RESTRICT ON DELETE RESTRICT,
	FOREIGN KEY("airport_depart_id") REFERENCES "airport"("id") ON UPDATE RESTRICT ON DELETE RESTRICT
);
CREATE TABLE IF NOT EXISTS "hearts" (
	"ticket_code"	TEXT NOT NULL,
	"flight_id"	TEXT NOT NULL,
	"airline_id"	TEXT NOT NULL,
	"user_id"	TEXT NOT NULL,
	PRIMARY KEY("ticket_code","flight_id","airline_id","user_id"),
	FOREIGN KEY("ticket_code","flight_id","airline_id") REFERENCES "ticket"("code","flight_id","airline_id") ON UPDATE RESTRICT ON DELETE RESTRICT,
	FOREIGN KEY("user_id") REFERENCES "user"("id") ON UPDATE RESTRICT ON DELETE RESTRICT
);
CREATE TABLE IF NOT EXISTS "ticket" (
	"code"	TEXT,
	"flight_id"	TEXT NOT NULL,
	"airline_id"	TEXT NOT NULL,
	"class"	TEXT NOT NULL,
	"price"	REAL NOT NULL CHECK("price" >= 0),
	"availability"	INTEGER NOT NULL CHECK("availability" >= 0),
	PRIMARY KEY("code","flight_id","airline_id"),
	FOREIGN KEY("airline_id") REFERENCES "airline"("id") ON UPDATE RESTRICT ON DELETE RESTRICT,
	FOREIGN KEY("flight_id") REFERENCES "flight"("id") ON UPDATE RESTRICT ON DELETE RESTRICT
);
CREATE TABLE IF NOT EXISTS "user" (
	"id"	TEXT,
	"password"	TEXT NOT NULL,
	PRIMARY KEY("id")
);