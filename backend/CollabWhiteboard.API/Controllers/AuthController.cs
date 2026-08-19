using CollabWhiteboard.API.DTOs;
using CollabWhiteboard.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace CollabWhiteboard.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(
    UserManager<ApplicationUser> userManager,
    IConfiguration configuration) : ControllerBase
{
    // POST /api/auth/register
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        var user = new ApplicationUser
        {
            UserName = request.Email,
            Email = request.Email,
            DisplayName = request.DisplayName,
            AvatarColor = GenerateAvatarColor(request.Email),
        };

        var result = await userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
            return BadRequest(result.Errors.Select(e => e.Description));

        var token = GenerateJwtToken(user);
        return Ok(new AuthResponse(token, user.Id, user.Email!, user.DisplayName, user.AvatarColor));
    }

    // POST /api/auth/login
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var user = await userManager.FindByEmailAsync(request.Email);
        if (user is null || !await userManager.CheckPasswordAsync(user, request.Password))
            return Unauthorized("Invalid credentials.");

        var token = GenerateJwtToken(user);
        return Ok(new AuthResponse(token, user.Id, user.Email!, user.DisplayName, user.AvatarColor));
    }

    // GET /api/auth/me
    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var user = await userManager.FindByIdAsync(userId!);
        if (user is null) return NotFound();

        return Ok(new UserProfileResponse(user.Id, user.Email!, user.DisplayName, user.AvatarColor));
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private string GenerateJwtToken(ApplicationUser user)
    {
        var jwtKey = configuration["Jwt:Key"]
            ?? throw new InvalidOperationException("JWT key not configured.");

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id),
            new Claim(ClaimTypes.Email, user.Email!),
            new Claim("displayName", user.DisplayName),
            new Claim("avatarColor", user.AvatarColor),
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expiry = DateTime.UtcNow.AddDays(
            int.Parse(configuration["Jwt:ExpiryDays"] ?? "7"));

        var token = new JwtSecurityToken(
            issuer: configuration["Jwt:Issuer"],
            audience: configuration["Jwt:Audience"],
            claims: claims,
            expires: expiry,
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static string GenerateAvatarColor(string email)
    {
        // Deterministically pick a color from a palette based on email hash
        string[] palette =
        [
            "#6366f1", "#8b5cf6", "#ec4899", "#14b8a6",
            "#f97316", "#22c55e", "#3b82f6", "#ef4444",
        ];
        var idx = Math.Abs(email.GetHashCode()) % palette.Length;
        return palette[idx];
    }
}
