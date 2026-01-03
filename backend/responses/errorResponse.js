const errorResponse = (res, code, msg, err = null) => {
    res.status(code).json({
      success: false,
      error: true,
      err,
      message: err?.message || msg
    });
  };
module.exports=errorResponse;