using CollabWhiteboard.API.Data;
using CollabWhiteboard.API.Hubs;
using CollabWhiteboard.API.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// ── Database ──────────────────────────────────────────────────────────────────
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// ── Identity ──────────────────────────────────────────────────────────────────
builder.Services.AddIdentity<ApplicationUser, IdentityRole>(options =>
{
    options.Password.RequireDigit = true;
    options.Password.RequiredLength = 8;
    options.Password.RequireNonAlphanumeric = false;
    options.User.RequireUniqueEmail = true;
})
.AddEntityFrameworkStores<AppDbContext>()
.AddDefaultTokenProviders();

// ── JWT Authentication ────────────────────────────────────────────────────────
var jwtKey = builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException("Jwt:Key is required.");

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
    };

    // Allow SignalR to authenticate via query string token (WebSocket handshake
    // does not support custom headers).
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) &&
                path.StartsWithSegments("/hubs/whiteboard"))
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        }
    };
});

builder.Services.AddAuthorization();

// ── SignalR ───────────────────────────────────────────────────────────────────
var signalRBuilder = builder.Services.AddSignalR(options =>
{
    options.MaximumReceiveMessageSize = 512 * 1024; // 512 KB max for Yjs diffs
});

// Use Azure SignalR Service when connection string is provided (production),
// otherwise fall back to self-hosted SignalR (local dev).
var azureSignalRConn = builder.Configuration.GetConnectionString("AzureSignalR");
if (!string.IsNullOrEmpty(azureSignalRConn))
{
    signalRBuilder.AddAzureSignalR(azureSignalRConn);
}

// ── CORS ─────────────────────────────────────────────────────────────────────
builder.Services.AddCors(options =>
{
    options.AddPolicy("VueFrontend", policy =>
    {
        var origins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
            ?? ["http://localhost:5173"];
            
        // If deployed to Azure, allow the specific Static Web App URL
        var frontendUrl = builder.Configuration["FRONTEND_URL"];
        if (!string.IsNullOrEmpty(frontendUrl))
        {
            origins = origins.Append(frontendUrl).ToArray();
        }

        policy.WithOrigins(origins)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials(); // Required for SignalR WebSocket handshake
    });
});

// ── Controllers & OpenAPI (built-in .NET 10) ──────────────────────────────────
builder.Services.AddControllers();
builder.Services.AddOpenApi(); // Native .NET 10 OpenAPI (replaces Swashbuckle)

// ── Health Checks ──────────────────────────────────────────────────────────────
builder.Services.AddHealthChecks();

// ─────────────────────────────────────────────────────────────────────────────
var app = builder.Build();

// ── Auto-migrate on startup ──
// Required because the free Azure SQL database starts completely empty.
// In a true enterprise environment, this is done via a CI/CD step, 
// but for this deployment, auto-migration ensures it "just works".
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
}

// ── Middleware Pipeline ────────────────────────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi(); // available at /openapi/v1.json
}

app.UseStaticFiles(); // Serves Vue built output from wwwroot/
app.UseCors("VueFrontend");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<WhiteboardHub>("/hubs/whiteboard");
app.MapHealthChecks("/health");

// SPA fallback — serve index.html for any unmatched routes
app.MapFallbackToFile("index.html");

await app.RunAsync();

// Expose for integration testing
public partial class Program { }
