let isLogin = true; // Default to login state
let currentUserData = null;
let selectedFlight = null;

/**
 * Initialize app and check for existing session
 */
window.onload = () => {
    const savedUser = localStorage.getItem('jetswift_user');
    if (savedUser) {
        currentUserData = JSON.parse(savedUser);
        enterDashboard();
    }
};

/**
 * Switch from Auth screen to Dashboard
 */
function enterDashboard() {
    document.getElementById('auth-container').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    document.getElementById('user-display-name').innerText = currentUserData.name.split(' ')[0];
    showSearch();
}

/**
 * Toggles between Login and Sign Up forms
 */
function toggleAuth() {
    isLogin = !isLogin;
    document.getElementById('form-title').innerText = isLogin ? "Neural Login" : "Initialize Account";
    document.getElementById('btn-text').innerText = isLogin ? "Authenticate" : "Initialize";
    document.getElementById('name-group').classList.toggle('hidden', isLogin);
}

/**
 * Expandable Profile Menu Logic
 */
function toggleDropdown() {
    document.getElementById('profile-dropdown').classList.toggle('show');
}

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

    if (!email || !password) return alert("System requires full credentials.");

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
                localStorage.setItem('jetswift_user', JSON.stringify(data.user));
                enterDashboard();
            } else {
                alert("Account initialized. Please proceed to authentication.");
                toggleAuth();
            }
        } else {
            alert(data.error || "Access Denied.");
        }
    } catch (err) {
        alert("Neural link failed. Server unreachable.");
    }
}

/**
 * Flight Search with Styled Result Cards
 */
async function findTrip() {
    const origin = document.getElementById('origin').value;
    const destination = document.getElementById('destination').value;
    const resultsDiv = document.getElementById('results');

    if (!origin || !destination) return alert("Specify trajectory coordinates.");

    resultsDiv.innerHTML = `<div style="text-align:center; padding: 20px;">Scanning airspace...</div>`;

    try {
        const url = `https://jetswift-backend.onrender.com/flights/search?origin=${origin}&destination=${destination}`;
        const response = await fetch(url);
        const flights = await response.json();

        resultsDiv.innerHTML = "";
        if (flights.length === 0) return resultsDiv.innerHTML = "<p style='text-align:center;'>No trajectories found for this sector.</p>";

        flights.forEach(f => {
            resultsDiv.innerHTML += `
                <div class="glass-panel" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; animation: fadeIn 0.5s ease;">
                    <div>
                        <h3 style="margin:0; color: var(--primary-glow);">${f.airline}</h3>
                        <p style="margin: 5px 0; font-size: 14px; color: var(--text-dim);">${f.flightNumber} | ${f.date}</p>
                        <p style="margin: 0; font-weight: bold;">${f.origin} ➔ ${f.destination}</p>
                    </div>
                    <div style="text-align: right;">
                        <h2 style="margin:0; color: #fff;">₹${f.price}</h2>
                        <button onclick="openBookingModal('${f.airline}', '${f.flightNumber}', '${f.origin}', '${f.destination}', '${f.price}', '${f.date}')" 
                                style="margin-top: 10px; padding: 10px 20px; font-size: 14px;">
                            Book Seat
                        </button>
                    </div>
                </div>`;
        });
    } catch (err) {
        resultsDiv.innerHTML = "Error accessing flight data.";
    }
}

/**
 * Booking Flow
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

    if (!age || !mobile || !address) return alert("Passenger identity data incomplete.");

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
            name: "JETSWIFT",
            description: `Trajectory: ${selectedFlight.flightNo}`,
            order_id: order.id,
            handler: function (res) {
                alert("Transaction Confirmed.");
                closeModal();
                generatePDFTicket(selectedFlight.airline, selectedFlight.flightNo, selectedFlight.from, selectedFlight.to, selectedFlight.price, selectedFlight.date);
            },
            prefill: { name: currentUserData.name, email: currentUserData.email },
            theme: { color: "#00d2ff" }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
    } catch (err) {
        alert("Payment gateway connection failed.");
    }
}

function generatePDFTicket(airline, flightNo, from, to, price, date) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text("JETSWIFT OFFICIAL TICKET", 10, 20);
    doc.setFontSize(12);
    
    const content = `
    -------------------------------------------
    PASSENGER: ${currentUserData.name}
    AGE: ${currentUserData.age}
    CONTACT: ${currentUserData.pass_mobile}
    
    FLIGHT: ${airline} ${flightNo}
    ROUTE: ${from} -> ${to}
    DATE: ${date}
    AMOUNT PAID: INR ${price}
    
    STATUS: SYSTEM CONFIRMED
    -------------------------------------------
    `;

    doc.text(content, 10, 40);
    doc.save(`Ticket_${flightNo}.pdf`);
}

/**
 * Session Management
 */
function handleLogout() {
    localStorage.removeItem('jetswift_user');
    location.reload(); 
}

function showProfile() {
    document.getElementById('booking-section').classList.add('hidden');
    document.getElementById('profile-section').classList.remove('hidden');
    document.getElementById('p-name-display').innerText = currentUserData.name;
    document.getElementById('p-email-display').innerText = currentUserData.email;
}

function showSearch() {
    document.getElementById('profile-section').classList.add('hidden');
    document.getElementById('booking-section').classList.remove('hidden');
}