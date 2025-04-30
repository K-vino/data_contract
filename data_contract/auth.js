
document.getElementById('login-form').addEventListener('submit', function (event) {
    event.preventDefault(); // Prevent form from submitting the default way
  
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const errorDiv = document.getElementById('login-error');
  
    // Hardcoded admin credentials
    const adminEmail = 'admin@gmail.com';
    const adminPassword = 'admin1234';
  
    if (email === adminEmail && password === adminPassword) {
      // Redirect to the admin dashboard
      window.location.href = 'dashboard_page.html';
    } else {
      // Show error message
      errorDiv.textContent = 'Invalid email or password!';
    }
  });