using System;

namespace Xtrena.Api.Features.Auth.Common;

public interface IPasswordService
{
    string Hash(string password);
    bool Verify(string password, string passwordHash);
    PasswordPolicyResult Validate(string password);
}
