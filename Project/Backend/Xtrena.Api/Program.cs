using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using Xtrena.Api.Domain.Constants;
using Xtrena.Api.Features;
using Xtrena.Api.Features.Auth.Common;
using Xtrena.Api.Persistence;
using Xtrena.Api.Persistence.Seeding;
using Xtrena.Api.SharedKernel.Errors;
using Xtrena.Api.SharedKernel.Identity;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// ---- DB ----
builder.Services.AddDbContext<XtrenaDbContext>(o =>
    o.UseSqlServer(builder.Configuration.GetConnectionString("Default")));

// ---- Auth: MapInboundClaims=false → If claim, SecurityConstants literals ----
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.MapInboundClaims = false;
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidateAudience = true,
            ValidAudience = builder.Configuration["Jwt:Audience"],
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1),
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"] ?? string.Empty)),
            NameClaimType = SecurityConstants.ClaimUsername,     // "unique_name"
            RoleClaimType = SecurityConstants.ClaimRole,         // "role"
        };
    });

// fallback: login/refresh AllowAnonymous endpoints another all authenticate
builder.Services.AddAuthorization(o =>
    o.FallbackPolicy = new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build());

// ---- FR-001 rate limits: "login" 10/min/IP, "api" 60/min/user ----
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.AddPolicy("login", ctx => RateLimitPartition.GetFixedWindowLimiter(
        ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions
        { PermitLimit = 10, Window = TimeSpan.FromMinutes(1), AutoReplenishment = true }));
    o.AddPolicy("api", ctx => RateLimitPartition.GetFixedWindowLimiter(
        ctx.User.Identity?.Name ?? ctx.Connection.RemoteIpAddress?.ToString() ?? "anon",
        _ => new FixedWindowRateLimiterOptions
        { PermitLimit = 60, Window = TimeSpan.FromMinutes(1), AutoReplenishment = true }));
});

// ---- CORS (Vite dev origin) ----
builder.Services.AddCors(o => o.AddPolicy("frontend", p => p
    .WithOrigins(builder.Configuration["Cors:Frontend"] ?? "http://localhost:5173")
    .AllowAnyHeader().AllowAnyMethod().AllowCredentials()));

// ---- Swagger + JWT bearer ----
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "X-Trena API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        In = ParameterLocation.Header, Name = "Authorization", Type = SecuritySchemeType.Http,
        Scheme = "bearer", BearerFormat = "JWT",
        Description = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxNzIyODkwYS1jZTliLTQxOTAtNjc1My0wOGRmMmZiMGY1NGEiLCJ1bmlxdWVfbmFtZSI6ImFkbWluIiwibmFtZSI6IlN5c3RlbSBBZG1pbmlzdHJhdG9yIiwiZW1haWwiOiJhZG1pbkB4dHJlbmEubG9jYWwiLCJyb2xlIjoiQURNSU4iLCJuYmYiOjE3OTI2MTUxNzUsImV4cCI6MTc5MjYxNjA3NSwiaXNzIjoiWHRyZW5hLkFwaSIsImF1ZCI6Ilh0cmVuYS5DbGllbnQifQ.ojCdbsA8NUzwAla8YvzMbTq43yvnMSWQkYlRpjrEMXQ",
    });
    c.AddSecurityRequirement(doc => new OpenApiSecurityRequirement
    {
        [new OpenApiSecuritySchemeReference("Bearer", doc)] = new List<string>(),
    });
});

// ---- VSA wiring: M1 features ඔක්කොම මෙතනින් ----
builder.Services.AddHttpContextAccessor();
builder.Services.AddAuthFeature(builder.Configuration);   // Password/Jwt services + JwtOptions
builder.Services.AddScoped<ICurrentUser, HttpCurrentUser>();
builder.Services.AddSingleton(TimeProvider.System);
    
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var app = builder.Build();

// Configure the HTTP request pipeline.
app.UseAppExceptionHandler();  
app.UseCors("frontend");

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseRateLimiter();             // 429 before auth (login throttle)
app.UseAuthentication();
app.UseAuthorization();

var api = app.MapGroup("/api/v1").RequireRateLimiting("api");   // FE proxy /api/v1
api.MapFeatures();

api.MapGet("/meta/time", () =>
        Results.Ok(new { serverTimeUtc = DateTime.UtcNow }))
    .AllowAnonymous().WithName("MetaTime");

app.MapGet("/health", () =>
        Results.Ok(new { status = "healthy", service = "x-trena-api" }))
    .AllowAnonymous();


// ---- migrations + seed (Development හෝ --seed) ----
if (app.Environment.IsDevelopment() || args.Contains("--seed"))
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<XtrenaDbContext>();
    var passwords = scope.ServiceProvider.GetRequiredService<IPasswordService>();
    await db.Database.MigrateAsync();
    await AuthSeeder.SeedAsync(db, passwords);
}

app.Run();

public partial class Program { }