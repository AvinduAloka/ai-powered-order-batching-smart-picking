using System;
using System.Security.Cryptography;
using Xtrena.Api.Domain.Constants;

namespace Xtrena.Api.Features.Auth.Common;

public sealed class PasswordService : IPasswordService
{
    private const int Iterations = 210_000;
    private const int KeyBytes = 32;
    private static readonly HashAlgorithmName Algorithm = HashAlgorithmName.SHA256;

    public string Hash(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(16);
        var key = Rfc2898DeriveBytes.Pbkdf2(password, salt, Iterations, Algorithm, KeyBytes);
        // format: algorithm$iterations$saltB64$keyB64 — self-describing, upgrade කරන්න පුළුවන්
        return $"pbkdf2-sha256${Iterations}${Convert.ToBase64String(salt)}${Convert.ToBase64String(key)}";
    }

    public bool Verify(string password, string passwordHash)
    {
        try
        {
            var parts = passwordHash.Split('$');
            if (parts.Length != 4 || parts[0] != "pbkdf2-sha256") return false;
            if (!int.TryParse(parts[1], out var iterations)) return false;

            var salt = Convert.FromBase64String(parts[2]);
            var expected = Convert.FromBase64String(parts[3]);
            var actual = Rfc2898DeriveBytes.Pbkdf2(password, salt, iterations, Algorithm, expected.Length);

            // ★ constant-time — timing attack වලටත් නෑ
            return CryptographicOperations.FixedTimeEquals(actual, expected);
        }
        catch
        {
            return false;   // ★ malformed hash = වැරදුනා (crash නොවේ)
        }
    }

    public PasswordPolicyResult Validate(string password)
    {
        var errors = new List<string>();

        if (password.Length < SecurityConstants.PasswordMinLength)
            errors.Add($"At least {SecurityConstants.PasswordMinLength} characters.");
        if (password.Length > SecurityConstants.PasswordMaxLength)
            errors.Add($"At most {SecurityConstants.PasswordMaxLength} characters.");
        if (!password.Any(char.IsUpper)) errors.Add("One uppercase letter.");
        if (!password.Any(char.IsLower)) errors.Add("One lowercase letter.");
        if (!password.Any(char.IsDigit)) errors.Add("One digit.");
        if (!password.Any(c => !char.IsLetterOrDigit(c))) errors.Add("One special character.");

        return errors.Count == 0 ? PasswordPolicyResult.Ok() : new PasswordPolicyResult(false, errors);
    }
}

public sealed record PasswordPolicyResult(bool IsValid, IReadOnlyList<string> Errors)
{
    public static PasswordPolicyResult Ok() => new(true, Array.Empty<string>());
}