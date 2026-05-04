let isLogin = false;
let currentUserData = null;

/**
 * Toggles between Login and Sign Up forms
 */
function toggleAuth() {
    isLogin = !isLogin;
    document.getElementById('form-title').innerText = isLogin ? "Login" : "Sign Up";
    document.getElementById('btn-text').innerText = isLogin ? "Login" : "Register";

    const extraFields = ['name', 'pass_mobile', 'age', 'par_mobile', 'country', 'state', 'district'];
    extraFields.forEach(id => {
        const field = document.getElementById(id);
        if (field) field.classList.toggle('hidden', isLogin);
    });
}

/**
 * Handles User Registration and Login
 */
async function submitAuth() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!email || !password) {
        alert("Please enter your email and password.");
        return;
    }

    const endpoint = isLogin ? '/login' : '/register';
    
    // Build the data object based on whether we are logging in or registering
    let bodyData = { email, password };
    if (!isLogin) {
        bodyData = {
            name: document.getElementById('name').value,
            email,
            password,
            age: document.getElementById('age').value,
            pass_mobile: document.getElementById('pass_mobile').value,
            par_mobile: document.getElementById('par_mobile').value,
            country: document.getElementById('country').value,
            state: document.getElementById('state').value,
            district: document.getElementById('district').value
        };
    }

    try {
        const response = await fetch(`https://jetswift-backend.onrender.com${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyData)
        });

        const data = await response.json();

        if (response.ok) {
            if (isLogin) {
                // SUCCESSFUL LOGIN
                currentUserData = data.user;
                
                // Construct a readable address from the components
                currentUserData.address = `${data.user.district || ''}, ${data.user.state || ''}, ${data.user.country || ''}`;
                
                // Transition UI
                document.getElementById('auth-box').classList.add('hidden');
                document.getElementById('dashboard').classList.remove('hidden');
                document.getElementById('user-name').innerText = data.user.name;
                showSearch(); // Open the flight search by default
            } else {
                // SUCCESSFUL REGISTRATION
                alert("Account created successfully! Please login to continue.");
                toggleAuth();
            }
        } else {
            alert(data.error || "Authentication failed. Please check your details.");
        }
    } catch (err) {
        console.error("Auth Error:", err);
        alert("Unable to connect to the server.");
    }
}

/**
 * Navigation: Switch to Flight Search view
 */
function showSearch() {
    document.getElementById('profile-section').classList.add('hidden');
    document.getElementById('booking-section').classList.remove('hidden');
}

/**
 * Navigation: Switch to User Profile view
 */
function showProfile() {
    document.getElementById('booking-section').classList.add('hidden');
    document.getElementById('profile-section').classList.remove('hidden');
    
    // Fill in the details
    document.getElementById('p-age').innerText = currentUserData.age || 'N/A';
    document.getElementById('p-mobile').innerText = currentUserData.pass_mobile || 'N/A';
    document.getElementById('p-address').innerText = currentUserData.address || 'N/A';
}

/**
 * Navigation: Back button from Profile
 */
function hideProfile() {
    showSearch();
}

/**
 * Flight Search Logic
 */
async function findTrip() {
    const originVal = document.getElementById('origin').value;
    const destVal = document.getElementById('destination').value;
    const resultsDiv = document.getElementById('results');
    
    if (!originVal || !destVal) {
        alert("Please enter both origin and destination");
        return;
    }

    resultsDiv.innerHTML = "<p style='color: white;'>Searching for flights...</p>";

    try {
        const url = `https://jetswift-backend.onrender.com/flights/search?origin=${originVal}&destination=${destVal}`;
        const response = await fetch(url);
        const flights = await response.json();

        resultsDiv.innerHTML = ""; 

        if (flights.length === 0) {
            resultsDiv.innerHTML = "<p style='color: white;'>No flights found for this route.</p>";
            return;
        }

        flights.forEach(flight => {
            resultsDiv.innerHTML += `
                <div style="border: none; padding: 15px; margin-top: 15px; border-radius: 12px; color: #333; background: #fff; box-shadow: 0 8px 16px rgba(0,0,0,0.2);">
                    <strong>${flight.airline}</strong> - ${flight.flightNumber}<br>
                    <small>${flight.origin} to ${flight.destination}</small><br>
                    <div style="margin-top: 10px; font-weight: bold; color: #007bff;">₹${flight.price} | ${flight.date}</div>
                    <button onclick="bookTicket('${flight.airline}', '${flight.flightNumber}', '${flight.origin}', '${flight.destination}', '${flight.price}', '${flight.date}')" 
                            style="margin-top:10px; background: #28a745; padding: 10px; font-size: 14px; width: 100%; border-radius: 6px;">
                        Book & Download Ticket
                    </button>
                </div>
            `;
        });
    } catch (err) {
        console.error("Search Error:", err);
        resultsDiv.innerHTML = "<p style='color: red;'>Failed to load flights.</p>";
    }
}

/**
 * Payment and Ticket Generation
 */
async function bookTicket(airline, flightNo, from, to, price, date) {
    try {
        const response = await fetch('https://jetswift-backend.onrender.com/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: price })
        });
        const order = await response.json();

        const options = {
            key: "rzp_test_Skn83hTPivycrT", 
            amount: order.amount,
            currency: "INR",
            name: "SkyHigh Air",
            description: `Booking ${flightNo}`,
            order_id: order.id,
            handler: function (response) {
                alert("Payment Successful!");
                generatePDFTicket(airline, flightNo, from, to, price, date);
            },
            prefill: {
                name: currentUserData.name,
                email: currentUserData.email,
            },
            theme: { color: "#003580" }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
    } catch (err) {
        alert("Payment gateway error. Please try again.");
    }
}

function generatePDFTicket(airline, flightNo, from, to, price, date) { 
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const ticketContent = `
    -------------------------------------------
               SKYHIGH AIR TICKET
    -------------------------------------------
    PASSENGER DETAILS:
    Name: ${currentUserData.name}
    Age: ${currentUserData.age}
    Mobile: ${currentUserData.pass_mobile}
    Address: ${currentUserData.address}
    
    FLIGHT DETAILS:
    Airline: ${airline}
    Flight Number: ${flightNo}
    Route: ${from} -> ${to}
    Date: ${date}
    Total Paid: INR ${price}
    
    Status: CONFIRMED
    -------------------------------------------
    Thank you for choosing SkyHigh!
    `;

    doc.text(ticketContent, 10, 10);
    doc.save(`SkyHigh_Ticket_${flightNo}.pdf`);
    alert("Ticket downloaded successfully!");
}

/**
 * Professional Logout Logic
 */
function handleLogout() {
    // 1. Hide the interactive parts
    document.getElementById('booking-section').classList.add('hidden');
    document.getElementById('profile-section').classList.add('hidden');
    
    // 2. Show loader for "securing session" feel
    const loader = document.getElementById('loader');
    if (loader) loader.classList.remove('hidden');

    setTimeout(() => {
        // Clear variables
        currentUserData = null;
        localStorage.removeItem('currentUser'); 
        
        // 3. Reset the UI to Sign Up/Login screen
        document.getElementById('dashboard').classList.add('hidden');
        if (loader) loader.classList.add('hidden');
        document.getElementById('auth-box').classList.remove('hidden');
        
        // Clear sensitive inputs
        document.getElementById('password').value = "";
        console.log("Logged out successfully.");
    }, 1200);
}