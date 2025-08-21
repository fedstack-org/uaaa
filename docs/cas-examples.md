# CAS Protocol Examples

This document provides examples of how to integrate with UAAA's CAS protocol implementation.

## Example 1: Simple Web Application Integration

### Step 1: Redirect User to CAS Login

When a user accesses a protected resource in your application, redirect them to the CAS login endpoint:

```javascript
// JavaScript example
const serviceUrl = encodeURIComponent('https://myapp.example.com/protected')
const casLoginUrl = `https://auth.example.com/cas/login?service=${serviceUrl}`
window.location.href = casLoginUrl
```

```python
# Python Flask example
from flask import redirect, request, url_for
from urllib.parse import quote

@app.route('/protected')
def protected():
    if 'user' not in session:
        service_url = quote(request.url)
        cas_login_url = f"https://auth.example.com/cas/login?service={service_url}"
        return redirect(cas_login_url)
    return render_template('protected.html')
```

### Step 2: Handle CAS Callback

When the user completes authentication, CAS will redirect back to your service with a ticket:

```javascript
// JavaScript/Node.js example
app.get('/protected', async (req, res) => {
  const ticket = req.query.ticket
  
  if (!ticket) {
    // Redirect to CAS login
    const serviceUrl = encodeURIComponent(req.originalUrl)
    return res.redirect(`https://auth.example.com/cas/login?service=${serviceUrl}`)
  }
  
  try {
    // Validate ticket
    const user = await validateCASTicket(ticket, req.originalUrl)
    req.session.user = user
    res.render('protected', { user })
  } catch (error) {
    res.status(401).send('Authentication failed')
  }
})

async function validateCASTicket(ticket, serviceUrl) {
  const validateUrl = new URL('https://auth.example.com/cas/serviceValidate')
  validateUrl.searchParams.set('service', serviceUrl.split('?')[0]) // Remove ticket parameter
  validateUrl.searchParams.set('ticket', ticket)
  validateUrl.searchParams.set('format', 'JSON')
  
  const response = await fetch(validateUrl)
  const data = await response.json()
  
  if (data.serviceResponse.authenticationSuccess) {
    return data.serviceResponse.authenticationSuccess.user
  } else {
    throw new Error('Ticket validation failed')
  }
}
```

```python
# Python Flask example with XML parsing
import requests
import xml.etree.ElementTree as ET
from urllib.parse import quote, unquote

@app.route('/protected')
def protected():
    ticket = request.args.get('ticket')
    
    if not ticket:
        # Redirect to CAS login
        service_url = quote(request.url)
        cas_login_url = f"https://auth.example.com/cas/login?service={service_url}"
        return redirect(cas_login_url)
    
    try:
        # Validate ticket
        user_info = validate_cas_ticket(ticket, request.url.split('?')[0])
        session['user'] = user_info['user']
        session['attributes'] = user_info['attributes']
        return render_template('protected.html', user=user_info)
    except Exception as e:
        return "Authentication failed", 401

def validate_cas_ticket(ticket, service_url):
    validate_url = "https://auth.example.com/cas/serviceValidate"
    params = {
        'service': service_url,
        'ticket': ticket
    }
    
    response = requests.get(validate_url, params=params)
    
    if response.status_code == 200:
        root = ET.fromstring(response.text)
        
        # Check for authentication success
        success = root.find('.//{http://www.yale.edu/tp/cas}authenticationSuccess')
        if success is not None:
            user = success.find('.//{http://www.yale.edu/tp/cas}user').text
            
            # Extract attributes
            attributes = {}
            attrs_elem = success.find('.//{http://www.yale.edu/tp/cas}attributes')
            if attrs_elem is not None:
                for attr in attrs_elem:
                    attr_name = attr.tag.split('}')[-1]  # Remove namespace
                    attributes[attr_name] = attr.text
            
            return {'user': user, 'attributes': attributes}
        else:
            # Authentication failed
            failure = root.find('.//{http://www.yale.edu/tp/cas}authenticationFailure')
            error_msg = failure.text if failure is not None else 'Unknown error'
            raise Exception(f"CAS authentication failed: {error_msg}")
    else:
        raise Exception(f"CAS validation request failed: {response.status_code}")
```

## Example 2: Single Logout

Implement CAS single logout to log users out of all CAS-enabled applications:

```javascript
// JavaScript logout
function casLogout() {
  const serviceUrl = encodeURIComponent('https://myapp.example.com/')
  window.location.href = `https://auth.example.com/cas/logout?service=${serviceUrl}`
}
```

```python
# Python Flask logout
@app.route('/logout')
def logout():
    session.clear()
    service_url = quote(url_for('index', _external=True))
    return redirect(f"https://auth.example.com/cas/logout?service={service_url}")
```

## Example 3: JSON Response Format

For modern applications, you can request JSON responses instead of XML:

```javascript
// Request JSON format
async function validateCASTicketJSON(ticket, serviceUrl) {
  const validateUrl = new URL('https://auth.example.com/cas/serviceValidate')
  validateUrl.searchParams.set('service', serviceUrl)
  validateUrl.searchParams.set('ticket', ticket)
  validateUrl.searchParams.set('format', 'JSON')
  
  const response = await fetch(validateUrl)
  const data = await response.json()
  
  if (data.serviceResponse.authenticationSuccess) {
    return {
      user: data.serviceResponse.authenticationSuccess.user,
      attributes: data.serviceResponse.authenticationSuccess.attributes || {}
    }
  } else {
    const failure = data.serviceResponse.authenticationFailure
    throw new Error(`CAS validation failed: ${failure.code} - ${failure.description}`)
  }
}
```

## Example 4: Environment Configuration

Configure your application to work with different CAS servers:

```javascript
// environment.js
const config = {
  development: {
    casBaseUrl: 'http://localhost:3000/cas',
    serviceUrl: 'http://localhost:8080'
  },
  production: {
    casBaseUrl: 'https://auth.company.com/cas',
    serviceUrl: 'https://myapp.company.com'
  }
}

export default config[process.env.NODE_ENV || 'development']
```

```python
# config.py
import os

class Config:
    CAS_BASE_URL = os.environ.get('CAS_BASE_URL', 'http://localhost:3000/cas')
    SERVICE_URL = os.environ.get('SERVICE_URL', 'http://localhost:5000')

class DevelopmentConfig(Config):
    CAS_BASE_URL = 'http://localhost:3000/cas'
    
class ProductionConfig(Config):
    CAS_BASE_URL = 'https://auth.company.com/cas'
```

## Example 5: Error Handling

Robust error handling for CAS integration:

```javascript
class CASError extends Error {
  constructor(code, description) {
    super(`CAS Error ${code}: ${description}`)
    this.code = code
    this.description = description
  }
}

async function validateTicketWithErrorHandling(ticket, serviceUrl) {
  try {
    const response = await fetch(validateUrl)
    
    if (!response.ok) {
      throw new CASError('HTTP_ERROR', `HTTP ${response.status}`)
    }
    
    const data = await response.json()
    
    if (data.serviceResponse.authenticationSuccess) {
      return data.serviceResponse.authenticationSuccess
    } else {
      const failure = data.serviceResponse.authenticationFailure
      throw new CASError(failure.code, failure.description)
    }
  } catch (error) {
    if (error instanceof CASError) {
      throw error
    }
    throw new CASError('NETWORK_ERROR', 'Failed to communicate with CAS server')
  }
}
```

## Security Best Practices

1. **Always use HTTPS** in production
2. **Validate service URLs** on the CAS server
3. **Use tickets only once** (they are automatically consumed)
4. **Handle ticket expiration** (5-minute timeout)
5. **Implement proper session management** after successful authentication
6. **Log authentication events** for security monitoring

## Testing

Use tools like curl to test CAS endpoints:

```bash
# Test login (will redirect to authorization UI)
curl -i "https://auth.example.com/cas/login?service=https://myapp.example.com/protected"

# Test service validation (replace with actual ticket)
curl "https://auth.example.com/cas/serviceValidate?service=https://myapp.example.com/protected&ticket=ST-1234567890&format=JSON"

# Test logout
curl -i "https://auth.example.com/cas/logout?service=https://myapp.example.com/"
```