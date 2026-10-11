export const errorHandler = (err, req, res, next) => {
  console.error("error in request:", err.message);
  const status = err.status || 500;
  return res.status(status).json({
    status: false,
    message: err.message || "something went wrong try again later",
    code: err.code || undefined,
  });
};
