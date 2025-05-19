CREATE TABLE IF NOT EXISTS "USER" (
    "id" STRING PRIMARY KEY,
    "password" STRING
);

CREATE TABLE IF NOT EXISTS "AIRPORT" (
    "id" STRING PRIMARY KEY,
    "city" STRING,
    "country" STRING
);

CREATE TABLE IF NOT EXISTS "AIRLINE" (
    "id" STRING PRIMARY KEY,
    "name" STRING,
    "website_link" STRING
);

CREATE TABLE IF NOT EXISTS "FLIGHT" (
    "id" STRING PRIMARY KEY,
    "num_of_tickets" STRING,
    "time_departure" STRING,
    "time_arrival" STRING,
    "airport_depart_id" STRING,
    "airport_arrive_id" STRING,
    "airline_id" STRING,
    FOREIGN KEY ("airport_depart_id") REFERENCES "AIRPORT" ("id")
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    FOREIGN KEY ("airport_arrive_id") REFERENCES "AIRPORT" ("id")
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    FOREIGN KEY ("airline_id") REFERENCES "AIRLINE" ("id")
        ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "TICKET" (
    "code" STRING,
    "class" STRING,
    "price" STRING,
    "availability" STRING,
    "flight_id" STRING,
    "airline_id" STRING,
    PRIMARY KEY ("code", "flight_id", "airline_id"),
    FOREIGN KEY ("flight_id") REFERENCES "FLIGHT" ("id")
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    FOREIGN KEY ("airline_id") REFERENCES "AIRLINE" ("id")
        ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "Hearts" (
    "ticket_code" STRING,
    "user_id" STRING,
    PRIMARY KEY ("ticket_code", "user_id"),
    FOREIGN KEY ("ticket_code") REFERENCES "TICKET" ("code")
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    FOREIGN KEY ("user_id") REFERENCES "USER" ("id")
        ON UPDATE RESTRICT ON DELETE RESTRICT
);
