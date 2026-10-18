const TryCatch = (handler) => {
  return async (req, res, next) => {
    try {
        await handler(req, res, next);
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || 'Server Error'
        });
    }
    };
};

export default TryCatch;