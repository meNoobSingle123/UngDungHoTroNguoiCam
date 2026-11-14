package com.nguoicam.api.config;

import java.io.IOException;
import java.net.URI;
import java.util.Collection;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;
import tools.jackson.databind.ObjectMapper;

@Configuration
@EnableConfigurationProperties(FirebaseProperties.class)
public class SecurityConfig {

  @Bean
  public SecurityFilterChain securityFilterChain(
      HttpSecurity http,
      ObjectMapper objectMapper
  ) throws Exception {
    AuthenticationEntryPoint problemEntryPoint = (request, response, authException) ->
        writeProblem(response, objectMapper, HttpStatus.UNAUTHORIZED, "Unauthorized", request);

    AccessDeniedHandler problemDeniedHandler = (request, response, accessDeniedException) ->
        writeProblem(response, objectMapper, HttpStatus.FORBIDDEN, "Forbidden", request);

    return http
        .csrf(AbstractHttpConfigurer::disable)
        .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(auth -> auth
            .requestMatchers("/actuator/health", "/actuator/health/**").permitAll()
            .requestMatchers(HttpMethod.GET, "/v1/library/packs").permitAll()
            .anyRequest().authenticated()
        )
        .oauth2ResourceServer(oauth2 -> oauth2
            .authenticationEntryPoint(problemEntryPoint)
            .jwt(jwt -> {})
        )
        .exceptionHandling(ex -> ex
            .authenticationEntryPoint(problemEntryPoint)
            .accessDeniedHandler(problemDeniedHandler)
        )
        .build();
  }

  @Bean
  public JwtDecoder jwtDecoder(FirebaseProperties props) {
    NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(props.jwkSetUri()).build();
    decoder.setJwtValidator(buildFirebaseValidator(props.projectId()));
    return decoder;
  }

  public static OAuth2TokenValidator<Jwt> buildFirebaseValidator(String projectId) {
    String expectedIssuer = "https://securetoken.google.com/" + projectId;
    OAuth2TokenValidator<Jwt> issuerAndTimestamp =
        JwtValidators.createDefaultWithIssuer(expectedIssuer);
    OAuth2TokenValidator<Jwt> audienceValidator = new JwtClaimValidator<Collection<String>>(
        "aud",
        aud -> aud != null && aud.contains(projectId)
    );
    OAuth2TokenValidator<Jwt> subjectValidator = new JwtClaimValidator<String>(
        "sub",
        sub -> sub != null && !sub.isBlank()
    );
    return new DelegatingOAuth2TokenValidator<>(
        issuerAndTimestamp,
        audienceValidator,
        subjectValidator
    );
  }

  private static void writeProblem(
      HttpServletResponse response,
      ObjectMapper objectMapper,
      HttpStatus status,
      String title,
      HttpServletRequest request
  ) throws IOException {
    ProblemDetail pd = ProblemDetail.forStatusAndDetail(status, title);
    pd.setTitle(title);
    pd.setInstance(URI.create(request.getRequestURI()));
    response.setStatus(status.value());
    response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
    objectMapper.writeValue(response.getOutputStream(), pd);
  }
}

