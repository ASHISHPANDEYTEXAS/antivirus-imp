let isLogin = false;
let currentUserData = null;
let selectedFlight = null; // Stores flight info while user fills modal

/**
 * Toggles between Login and Sign Up forms
 */
function toggleAuth() {
    isLogin = !isLogin;
    document.getElementById('form-title').innerText = isLogin ? "Login" : "Sign Up";
    document.getElementById('btn-text').innerText = isLogin ? "Login" : "Register";
    // Toggle name field visibility
    document.getElementById('name-group').classList.toggle('hidden', isLogin);
}

/**
 * Expandable Profile Menu Logic
 */
function toggleDropdown() {
    document.getElementById('profile-dropdown').classList.toggle('show');
}

// Close dropdown if user clicks outside
window.onclick = function(event) {
    if (!event.target.closest('.user-profile-wrapper')) {
        const dropdown = document.getElementById('profile-dropdown');
        if (dropdown && dropdown.classList.contains('show')) {
            dropdown.classList.remove('show');
        }
    }
}

/**
 * Authentication: Register/Login
 */
async function submitAuth() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const name = document.getElementById('name').value;

    if (!email || !password) return alert("Please fill all fields");

    const endpoint = isLogin ? '/login' : '/register';
    const bodyData = isLogin ? { email, password } : { name, email, password };

    try {
        const response = await fetch(`https://jetswift-backend.onrender.com${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyData)
        });

        const data = await response.json();
        if (response.ok) {
            if (isLogin) {
                currentUserData = data.user;
                document.getElementById('auth-box').classList.add('hidden');
                document.getElementById('dashboard').classList.remove('hidden');
                document.getElementById('user-display-name').innerText = data.user.name.split(' ')[0];
                showSearch();
            } else {
                alert("Account created! Please login.");
                toggleAuth();
            }
        } else {
            alert(data.error || "Error occurred");
        }
    } catch (err) {
        alert("Server connection failed.");
    }
}

/**
 * Flight Search
 */
async function findTrip() {
    const origin = document.getElementById('origin').value;
    const destination = document.getElementById('destination').value;
    const resultsDiv = document.getElementById('results');

    if (!origin || !destination) return alert("Enter both cities");

    resultsDiv.innerHTML = "<div class='spinner'></div>";

    try {
        const url = `https://jetswift-backend.onrender.com/flights/search?origin=${origin}&destination=${destination}`;
        const response = await fetch(url);
        const flights = await response.json();

        resultsDiv.innerHTML = "";
        if (flights.length === 0) return resultsDiv.innerHTML = "<p>No flights found.</p>";

        flights.forEach(f => {
            resultsDiv.innerHTML += `
                <div class="flight-card">
                    <div style="display:flex; justify-content:space-between;">
                        <strong>${f.airline}</strong>
                        <span style="color:#007bff; font-weight:bold;">₹${f.price}</span>
                    </div>
                    <p style="font-size:13px; color:#666; margin:5px 0;">${f.flightNumber} | ${f.date}</p>
                    <button onclick="openBookingModal('${f.airline}', '${f.flightNumber}', '${f.origin}', '${f.destination}', '${f.price}', '${f.date}')" 
                            style="padding:10px; font-size:14px; background: #28a745;">
                        Book Ticket
                    </button>
                </div>`;
        });
    } catch (err) {
        resultsDiv.innerHTML = "Error loading flights.";
    }
}

/**
 * Booking Flow: Modal -> Payment -> Ticket
 */
function openBookingModal(airline, flightNo, from, to, price, date) {
    selectedFlight = { airline, flightNo, from, to, price, date };
    document.getElementById('booking-modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('booking-modal').classList.add('hidden');
    selectedFlight = null;
}

async function confirmAndPay() {
    const age = document.getElementById('book-age').value;
    const mobile = document.getElementById('book-mobile').value;
    const address = document.getElementById('book-address').value;

    if (!age || !mobile || !address) return alert("Please provide passenger details.");

    // Update currentUserData with the details provided in the modal for the ticket
    currentUserData.age = age;
    currentUserData.pass_mobile = mobile;
    currentUserData.address = address;

    try {
        const response = await fetch('https://jetswift-backend.onrender.com/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: selectedFlight.price })
        });
        const order = await response.json();

        const options = {
            key: "rzp_test_Skn83hTPivycrT",
            amount: order.amount,
            currency: "INR",
            name: "SkyHigh Air",
            description: `Booking ${selectedFlight.flightNo}`,
            order_id: order.id,
            handler: function (res) {
                alert("Payment Successful!");
                closeModal();
                generatePDFTicket(selectedFlight.airline, selectedFlight.flightNo, selectedFlight.from, selectedFlight.to, selectedFlight.price, selectedFlight.date);
            },
            prefill: { name: currentUserData.name, email: currentUserData.email },
            theme: { color: "#003580" }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
    } catch (err) {
        alert("Payment initialization failed.");
    }
}

function generatePDFTicket(airline, flightNo, from, to, price, date) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const content = `
    -------------------------------------------
               SKYHIGH AIR TICKET
    -------------------------------------------
    PASSENGER: ${currentUserData.name} (Age: ${currentUserData.age})
    CONTACT: ${currentUserData.pass_mobile}
    ADDRESS: ${currentUserData.address}
    
    FLIGHT: ${airline} ${flightNo}
    ROUTE: ${from} -> ${to}
    DATE: ${date}
    PAID: INR ${price}
    
    STATUS: CONFIRMED
    -------------------------------------------
    `;

    doc.text(content, 10, 10);
    doc.save(`Ticket_${flightNo}.pdf`);
}

/**
 * Secure Logout & Profile Views
 */
function handleLogout() {
    document.getElementById('loader').classList.remove('hidden');
    setTimeout(() => {
        currentUserData = null;
        localStorage.clear();
        sessionStorage.clear();
        location.reload(); // Hard reset for security
    }, 1200);
}

function showProfile() {
    document.getElementById('booking-section').classList.add('hidden');
    document.getElementById('profile-section').classList.remove('hidden');
    document.getElementById('p-name-display').innerText = currentUserData.name;
    document.getElementById('p-email-display').innerText = currentUserData.email;
    document.getElementById('profile-dropdown').classList.remove('show');
}

function showSearch() {
    document.getElementById('profile-section').classList.add('hidden');
    document.getElementById('booking-section').classList.remove('hidden');
    document.getElementById('profile-dropdown').classList.remove('show');
}