// Calculate pagination parameters
export const getPaginationParams = (query) => {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
    const skip = (page - 1) * limit;
  
    return { page, limit, skip };
  };
  
  // Create pagination metadata
  export const createPaginationMeta = (totalItems, page, limit) => {
    const totalPages = Math.ceil(totalItems / limit);
  
    return {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      nextPage: page < totalPages ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null
    };
  };
  
  // Apply pagination to mongoose query
  export const applyPagination = async (Model, query, filter = {}, populate = []) => {
    const { page, limit, skip } = getPaginationParams(query);
  
    // Get total count
    const totalItems = await Model.countDocuments(filter);
  
    // Get paginated results
    let dbQuery = Model.find(filter)
      .limit(limit)
      .skip(skip);
  
    // Apply population if specified
    if (populate.length > 0) {
      populate.forEach(pop => {
        dbQuery = dbQuery.populate(pop);
      });
    }
  
    const items = await dbQuery.exec();
  
    const pagination = createPaginationMeta(totalItems, page, limit);
  
    return {
      items,
      pagination
    };
  };
  
  // Sort utility
  export const applySorting = (query, sortQuery) => {
    if (!sortQuery) return query;
  
    const sortFields = {};
    const sortParts = sortQuery.split(',');
  
    sortParts.forEach(field => {
      const trimmedField = field.trim();
      if (trimmedField.startsWith('-')) {
        sortFields[trimmedField.substring(1)] = -1;
      } else {
        sortFields[trimmedField] = 1;
      }
    });
  
    return query.sort(sortFields);
  };
  
  // Filter utility
  export const applyFilters = (baseFilter, query, allowedFilters) => {
    const filters = { ...baseFilter };
  
    allowedFilters.forEach(filter => {
      if (query[filter.field]) {
        switch (filter.type) {
          case 'exact':
            filters[filter.dbField || filter.field] = query[filter.field];
            break;
          case 'regex':
            filters[filter.dbField || filter.field] = {
              $regex: query[filter.field],
              $options: 'i'
            };
            break;
          case 'date':
            if (query[filter.field + '_from'] || query[filter.field + '_to']) {
              const dateFilter = {};
              if (query[filter.field + '_from']) {
                dateFilter.$gte = new Date(query[filter.field + '_from']);
              }
              if (query[filter.field + '_to']) {
                dateFilter.$lte = new Date(query[filter.field + '_to']);
              }
              filters[filter.dbField || filter.field] = dateFilter;
            }
            break;
          case 'in':
            if (Array.isArray(query[filter.field])) {
              filters[filter.dbField || filter.field] = { $in: query[filter.field] };
            } else {
              filters[filter.dbField || filter.field] = { $in: query[filter.field].split(',') };
            }
            break;
          case 'range':
            const rangeFilter = {};
            if (query[filter.field + '_min']) {
              rangeFilter.$gte = parseFloat(query[filter.field + '_min']);
            }
            if (query[filter.field + '_max']) {
              rangeFilter.$lte = parseFloat(query[filter.field + '_max']);
            }
            if (Object.keys(rangeFilter).length > 0) {
              filters[filter.dbField || filter.field] = rangeFilter;
            }
            break;
        }
      }
    });
  
    return filters;
  };
  