exports.asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next))
    .catch((error) => {
      console.error('Async handler error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Server error'
      });
    });
};