using System;

namespace Xtrena.Api.SharedKernel.Errors;

/// Application code `return 401`
public abstract class AppException(string message, IReadOnlyList<string>? errors = null)
    : Exception(message)
{
    public IReadOnlyList<string> Errors { get; } = errors ?? [];
}

// invalid credentials.
public sealed class UnauthorizedException(string message = "Invalid credentials.")
    : AppException(message);

// locked account.
public sealed class ForbiddenException(string message = "Forbidden.")
    : AppException(message);

// unknown product
public sealed class NotFoundException(string entity, string key)
    : AppException($"{entity} '{key}' was not found.")
{
    public string Entity { get; } = entity;
    public string Key { get; } = key;
}

// dup username, dup receipt no, negative stock
public sealed class ConflictException(string message) : AppException(message);

// semantics impossible (weight ≤ 0, qty ≤ 0, bad date range).
public sealed class UnprocessableException(string message, IReadOnlyList<string>? errors = null)
    : AppException(message, errors);

// malformed payload / non-SRS-specified validation.
public sealed class BadRequestException(string message, IReadOnlyList<string>? errors = null)
    : AppException(message, errors);

// generic validation failure
public sealed class ValidationException(string message, IReadOnlyList<string>? errors = null)
    : AppException(message, errors);

// RowVersion mismatch (lost update)
public sealed class ConcurrencyConflictException(string entity)
    : AppException($"{entity} was modified by another user. Reload and try again.");

// solver unreachable (Not client error)
public sealed class DependencyUnavailableException(string dependency)
    : AppException($"{dependency} is unavailable.");

// 500 — unexpected error.
public sealed class InternalServerException(
    string message = "An unexpected error occurred.") : AppException(message);