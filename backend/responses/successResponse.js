const successResponse = (res, result, msg) => {
    res.status(200).json({
      success: true,
      error: false,
      result,
      message: msg
    });
  };
  module.exports=successResponse;