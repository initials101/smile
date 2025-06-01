// Success response
export const successResponse = (res, data, message = 'Success', statusCode = 200) => {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  };
  
  // Error response
  export const errorResponse = (res, message = 'Internal Server Error', statusCode = 500, errors = null) => {
    const response = {
      success: false,
      message,
      timestamp: new Date().toISOString()
    };
  
    if (errors) {
      response.errors = errors;
    }
  
    return res.status(statusCode).json(response);
  };
  
  // Paginated response
  export const paginatedResponse = (res, data, pagination, message = 'Success', statusCode = 200) => {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      pagination: {
        currentPage: pagination.page,
        totalPages: pagination.totalPages,
        totalItems: pagination.totalItems,
        itemsPerPage: pagination.limit,
        hasNextPage: pagination.page < pagination.totalPages,
        hasPrevPage: pagination.page > 1
      },
      timestamp: new Date().toISOString()
    });
  };
  
  // Validation error response
  export const validationErrorResponse = (res, errors) => {
    const formattedErrors = errors.map(error => ({
      field: error.path || error.param,
      message: error.msg || error.message,
      value: error.value
    }));
  
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formattedErrors,
      timestamp: new Date().toISOString()
    });
  };
  
  // Not found response
  export const notFoundResponse = (res, resource = 'Resource') => {
    return res.status(404).json({
      success: false,
      message: `${resource} not found`,
      timestamp: new Date().toISOString()
    });
  };
  
  // Unauthorized response
  export const unauthorizedResponse = (res, message = 'Unauthorized access') => {
    return res.status(401).json({
      success: false,
      message,
      timestamp: new Date().toISOString()
    });
  };
  
  // Forbidden response
  export const forbiddenResponse = (res, message = 'Forbidden access') => {
    return res.status(403).json({
      success: false,
      message,
      timestamp: new Date().toISOString()
    });
  };
  
  // Conflict response
  export const conflictResponse = (res, message = 'Resource conflict') => {
    return res.status(409).json({
      success: false,
      message,
      timestamp: new Date().toISOString()
    });
  };
  