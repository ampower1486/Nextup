async function run() {
  try {
    const res = await fetch('http://localhost:3000/api/external/restaurants');
    const data = await res.json();
    console.log("restaurants:", JSON.stringify(data, null, 2));

    const res2 = await fetch('http://localhost:3000/api/tableserve?restaurant_id=ba611d0e-a418-44b4-afb6-54288dd872ef');
    const data2 = await res2.json();
    console.log("reservations:", JSON.stringify(data2, null, 2));
  } catch (err) {
    console.error(err);
  }
}
run();
