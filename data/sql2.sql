SELECT 
    DATE(r.time_departure) AS retDate,
    MIN(t.price) AS min_ret_price
FROM flight r 
JOIN airport a2 ON r.airport_depart_id = a2.id
JOIN airport a1 ON r.airport_arrive_id = a1.id
JOIN ticket t ON r.id = t.flight_id
WHERE lower(a1.city) = 'london' 
  AND lower(a2.city) = 'athens'
  AND DATE(r.time_departure) BETWEEN '2025-05-14' AND '2025-06-14'
GROUP BY retDate;
