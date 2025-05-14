-- SELECT DATE(f.time_departure) as outdate,DATE(r.time_departure) AS retDate
-- FROM flight f JOIN airport a1 ON f.airport_depart_id = a1.id
-- JOIN airport a2 ON f.airport_arrive_id = a2.id
-- JOIN flight r ON r.airport_depart_id = a2.id AND r.airport_arrive_id = a1.id
-- Join ticket as t on f.id=t.flight_id
-- WHERE lower(a1.city)='chicago' 
SELECT 
    DATE(f.time_departure) AS outDate,
    MIN(t.price) AS min_out_price
FROM flight f 
JOIN airport a1 ON f.airport_depart_id = a1.id
JOIN airport a2 ON f.airport_arrive_id = a2.id
JOIN ticket t ON f.id = t.flight_id
WHERE lower(a1.city) = 'athens' 
  AND lower(a2.city) = 'london'
  AND DATE(f.time_departure) BETWEEN '2025-05-14' AND '2025-06-14'
GROUP BY outDate;


