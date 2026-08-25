import { Field, ObjectType } from '@nestjs/graphql';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';
import { WorkspaceUrlsDTO } from 'src/engine/core-modules/workspace/dtos/workspace-urls.dto';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';

// SSO identity providers were removed from this fork; the type is kept in the
// schema (the list is always empty) so existing clients querying it keep working.
@ObjectType('SSOIdentityProvider')
export class SSOIdentityProviderDTO {
  @Field(() => UUIDScalarType)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => String)
  type: string;

  @Field(() => String)
  status: string;

  @Field(() => String)
  issuer: string;
}

@ObjectType('AuthProviders')
export class AuthProvidersDTO {
  @Field(() => [SSOIdentityProviderDTO])
  sso: Array<SSOIdentityProviderDTO>;

  @Field(() => Boolean)
  google: boolean;

  @Field(() => Boolean)
  magicLink: boolean;

  @Field(() => Boolean)
  password: boolean;

  @Field(() => Boolean)
  microsoft: boolean;
}

@ObjectType('AuthBypassProviders')
export class AuthBypassProvidersDTO {
  @Field(() => Boolean)
  google: boolean;

  @Field(() => Boolean)
  password: boolean;

  @Field(() => Boolean)
  microsoft: boolean;
}

@ObjectType('PublicWorkspaceData')
export class PublicWorkspaceDataDTO {
  @Field(() => UUIDScalarType)
  id: string;

  @Field(() => AuthProvidersDTO)
  authProviders: AuthProvidersDTO;

  @Field(() => AuthBypassProvidersDTO, { nullable: true })
  authBypassProviders?: AuthBypassProvidersDTO;

  @Field(() => String, { nullable: true })
  logo: WorkspaceEntity['logo'];

  @Field(() => String, { nullable: true })
  displayName: WorkspaceEntity['displayName'];

  @Field(() => WorkspaceUrlsDTO)
  workspaceUrls: WorkspaceUrlsDTO;
}

@ObjectType('PublicWorkspaceDataSummary')
export class PublicWorkspaceDataSummaryDTO {
  @Field(() => UUIDScalarType)
  id: string;

  @Field(() => String, { nullable: true })
  logo: WorkspaceEntity['logo'];

  @Field(() => String, { nullable: true })
  displayName: WorkspaceEntity['displayName'];
}
