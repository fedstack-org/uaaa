# CAS Protocol Implementation

This document describes the Central Authentication Service (CAS) protocol implementation in UAAA.

## Overview

CAS is a single sign-on protocol that allows web applications to authenticate users without handling user credentials directly. The UAAA CAS implementation follows the [CAS Protocol Specification](https://apereo.github.io/cas/6.6.x/protocol/CAS-Protocol-Specification.html).

## CAS Endpoints

### Login Endpoint
- **URL**: `/cas/login`
- **Methods**: GET, POST
- **Parameters**:
  - `service` (required): The URL of the service requesting authentication
  - `renew` (optional): Force fresh authentication
  - `gateway` (optional): Gateway mode for passive authentication

**Example**:
```
GET /cas/login?service=https://example.com/app
```

### Service Validate Endpoint
- **URL**: `/cas/serviceValidate`
- **Method**: GET
- **Parameters**:
  - `service` (required): The service URL that was provided to login
  - `ticket` (required): The service ticket to validate
  - `format` (optional): Response format (`JSON` or default XML)

**Example**:
```
GET /cas/serviceValidate?service=https://example.com/app&ticket=ST-1234567890
```

### Service Validate v3 Endpoint
- **URL**: `/cas/p3/serviceValidate`
- **Method**: GET
- **Parameters**: Same as `/cas/serviceValidate`

### Logout Endpoint
- **URL**: `/cas/logout`
- **Methods**: GET, POST
- **Parameters**:
  - `service` (optional): URL to redirect after logout

**Example**:
```
GET /cas/logout?service=https://example.com/app
```

## CAS Flow

1. **Initial Request**: User accesses a CAS-enabled service
2. **Redirect to CAS**: Service redirects user to `/cas/login?service=<service_url>`
3. **Authentication**: User authenticates with UAAA (if not already authenticated)
4. **Service Ticket**: CAS generates a service ticket and redirects back to service with ticket
5. **Ticket Validation**: Service validates the ticket by calling `/cas/serviceValidate`
6. **Access Granted**: If ticket is valid, service grants access to user

## Response Formats

### Success Response (XML)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<cas:serviceResponse xmlns:cas="http://www.yale.edu/tp/cas">
  <cas:authenticationSuccess>
    <cas:user>username</cas:user>
    <cas:attributes>
      <cas:email>user@example.com</cas:email>
      <cas:name>John Doe</cas:name>
    </cas:attributes>
  </cas:authenticationSuccess>
</cas:serviceResponse>
```

### Success Response (JSON)
```json
{
  "serviceResponse": {
    "authenticationSuccess": {
      "user": "username",
      "attributes": {
        "email": "user@example.com",
        "name": "John Doe"
      }
    }
  }
}
```

### Error Response (XML)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<cas:serviceResponse xmlns:cas="http://www.yale.edu/tp/cas">
  <cas:authenticationFailure code="INVALID_TICKET">
    Ticket not found or expired
  </cas:authenticationFailure>
</cas:serviceResponse>
```

## Configuration

### Service URL Validation
For production deployments, it's recommended to configure service URL validation to only allow trusted services. The current implementation accepts any valid HTTPS URL.

### User Attributes
The CAS implementation returns user claims as attributes in the validation response. The available attributes depend on the user's configured claims and the security level of the authentication.

## Integration with UAAA

The CAS implementation integrates seamlessly with UAAA's existing authentication and authorization system:

- Uses UAAA's session management for user authentication
- Leverages UAAA's security levels and claim system
- Integrates with the UI authorization flow
- Supports remote authorization (QR code authentication)

## Security Considerations

- Service tickets have a 5-minute expiration time
- Service tickets are single-use (consumed upon validation)
- Service URL validation should be implemented for production
- All CAS endpoints support HTTPS
- User attributes are filtered based on security level and application permissions