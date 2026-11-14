package com.nguoicam.api.config;

import jakarta.validation.ConstraintViolationException;
import java.net.URI;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class ProblemExceptionHandler {

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ProblemDetail handleValidation(MethodArgumentNotValidException ex) {
    ProblemDetail pd = ProblemDetail.forStatusAndDetail(
        HttpStatus.BAD_REQUEST,
        "Request validation failed"
    );
    pd.setTitle("Bad Request");
    pd.setType(URI.create("https://api.nguoicam.local/errors/validation"));
    pd.setProperty(
        "errors",
        ex.getBindingResult().getFieldErrors().stream()
            .map(err -> err.getField() + ": " + err.getDefaultMessage())
            .toList()
    );
    return pd;
  }

  @ExceptionHandler({
      HandlerMethodValidationException.class,
      ConstraintViolationException.class,
      HttpMessageNotReadableException.class,
      MissingServletRequestParameterException.class,
      MethodArgumentTypeMismatchException.class,
      IllegalArgumentException.class
  })
  public ProblemDetail handleBadRequest(Exception ex) {
    ProblemDetail pd = ProblemDetail.forStatusAndDetail(
        HttpStatus.BAD_REQUEST,
        "Invalid request payload or parameter"
    );
    pd.setTitle("Bad Request");
    pd.setType(URI.create("https://api.nguoicam.local/errors/bad-request"));
    return pd;
  }

  @ExceptionHandler(ResponseStatusException.class)
  public ProblemDetail handleStatus(ResponseStatusException ex) {
    ProblemDetail pd = ProblemDetail.forStatusAndDetail(
        ex.getStatusCode(),
        ex.getReason() != null ? ex.getReason() : "Request error"
    );
    pd.setTitle(ex.getStatusCode().toString());
    return pd;
  }
}

